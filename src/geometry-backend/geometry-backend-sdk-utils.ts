import { ShapeDiverRequestCache, ShapeDiverRequestCustomization, ShapeDiverRequestExport, ShapeDiverResponseDto, ShapeDiverResponseExport, ShapeDiverResponseOutput, ShapeDiverSdk } from "@shapediver/sdk.geometry-api-sdk-v2"
import { sleep } from "../util/utils"

/**
 * Get the session id
 * Will fail in case the given dto does not represent a session
 * @param dto 
 * @returns 
 */
export const getSessionId = (dto : ShapeDiverResponseDto) : string => {
    return dto.actions.find(a => a.name === 'default').href.split("/")[6]
}

/**
 * Get the maximum delay which was reported for output versions
 * @param dto 
 * @returns maximum delay, -1 in case no delay was reported
 */
export const getMaxOutputDelay = (dto : ShapeDiverResponseDto) : number => {
    return Math.max(
        ...Object.keys(dto.outputs)
        .map( id => dto.outputs[id] as ShapeDiverResponseOutput)
        .map( output => output.delay ?? -1 )
    )
}

/**
 * Get the delay which was reported for the export
 * @param dto 
 * @param exportId 
 * @returns delay, -1 in case no delay was reported
 */
export const getExportDelay = (dto : ShapeDiverResponseDto, exportId : string) : number => {
    const delay = (dto.exports[exportId] as ShapeDiverResponseExport).delay
    return delay ?? -1
}

/**
 * Given a dto resulting from a customization request, wait for the results to be finished
 * @param sdk 
 * @param dto 
 * @param maxWaitMsec maximum duration to wait for result (in milliseconds), pass value < 0 to disable limit
 * @returns 
 */
export const waitForCustomizationResult = async (sdk : ShapeDiverSdk, dto : ShapeDiverResponseDto, maxWaitMsec = -1) : Promise<ShapeDiverResponseDto> => {
    
    const sessionid = getSessionId(dto)
    
    const outputVersions : ShapeDiverRequestCache = {}
    Object.keys(dto.outputs).forEach(id => outputVersions[id] = (dto.outputs[id] as ShapeDiverResponseOutput).version)

    let maxDelay = getMaxOutputDelay(dto)
    const startMsec = Date.now()
 
    while ( maxDelay > 0 ) {

        // check whether maxWaitMsec has been reached
        if ( maxWaitMsec >= 0 ) {
            const waitMsec = Date.now() - startMsec
            if ( waitMsec >= maxWaitMsec ) {
                throw new Error(`Maximum wait time of ${maxWaitMsec} msec reached`)
            }
            if ( waitMsec + maxDelay > maxWaitMsec ) {
                maxDelay = maxWaitMsec - waitMsec
            }
        }
      
        // sleep for maxDelay
        await sleep(maxDelay)

        // send cache request
        dto = await sdk.output.getCache(sessionid, outputVersions)
        maxDelay = getMaxOutputDelay(dto)
    }

    return dto
}

/**
 * Given a dto resulting from an export request, wait for the result to be finished
 * @param sdk 
 * @param dto 
 * @param exportId 
 * @param maxWaitMsec maximum duration to wait for result (in milliseconds), pass value < 0 to disable limit
 * @returns 
 */
export const waitForExportResult = async (sdk : ShapeDiverSdk, dto : ShapeDiverResponseDto, exportId: string, maxWaitMsec = -1) : Promise<ShapeDiverResponseDto> => {
    
    const sessionid = getSessionId(dto)

    const exportVersion : ShapeDiverRequestCache = {[exportId] : (dto.exports[exportId] as ShapeDiverResponseExport).version}
    
    let delay = getExportDelay(dto, exportId)
    const startMsec = Date.now()

    while ( delay > 0 ) {

        // check whether maxWaitMsec has been reached
        if ( maxWaitMsec >= 0 ) {
            const waitMsec = Date.now() - startMsec
            if ( waitMsec >= maxWaitMsec ) {
                throw new Error(`Maximum wait time of ${maxWaitMsec} msec reached`)
            }
            if ( waitMsec + delay > maxWaitMsec ) {
                delay = maxWaitMsec - waitMsec
            }
        }

        // sleep for delay
        await sleep(delay)

        // send cache request
        dto = await sdk.export.getCache(sessionid, exportVersion)
        delay = getExportDelay(dto, exportId)
    }

    return dto
}

/**
 * Submit a customization request and wait for the result to be finished
 * @param sdk 
 * @param dto 
 * @param body 
 * @param maxWaitMsec maximum duration to wait for result (in milliseconds), pass value < 0 to disable limit 
 * @returns 
 */
export const submitAndWaitForCustomization = async (sdk : ShapeDiverSdk, dto : ShapeDiverResponseDto, body : ShapeDiverRequestCustomization, maxWaitMsec = -1) : Promise<ShapeDiverResponseDto> => {

    const sessionid = getSessionId(dto)

    const startMsec = Date.now()
    dto = await sdk.output.customize(sessionid, body)
    const waitMsec = Date.now() - startMsec

    return waitForCustomizationResult(sdk, dto, maxWaitMsec < 0 ? maxWaitMsec : Math.max(0, maxWaitMsec - waitMsec))
}

/**
 * Submit an export request and wait for the result to be finished
 * @param sdk 
 * @param dto 
 * @param body 
 * @param maxWaitMsec maximum duration to wait for result (in milliseconds), pass value < 0 to disable limit
 * @returns 
 */
export const submitAndWaitForExport = async (sdk : ShapeDiverSdk, dto : ShapeDiverResponseDto, body : ShapeDiverRequestExport, maxWaitMsec = -1) : Promise<ShapeDiverResponseDto> => {

    const sessionid = getSessionId(dto)

    const startMsec = Date.now()
    dto = await sdk.export.compute(sessionid, body)
    const waitMsec = Date.now() - startMsec

    return waitForExportResult(sdk, dto, body.exports.id, maxWaitMsec < 0 ? maxWaitMsec : Math.max(0, maxWaitMsec - waitMsec))
}
