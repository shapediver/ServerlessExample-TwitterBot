import { create, ShapeDiverResponseExportDefinition, ShapeDiverResponseOutputDefinition, ShapeDiverResponseExportDefinitionType, ShapeDiverRequestCustomization, ShapeDiverResponseExport, ShapeDiverResponseOutput, ShapeDiverResponseModelComputationStatus } from "@shapediver/sdk.geometry-api-sdk-v2"
import axios from "axios"

export interface IRunModelInput {
    text: string
    imageUrl: string
}

export interface IModelConfig {
    /** use a backend ticket here */
    ticket: string
    modelViewUrl: string
}

export interface IRunModelOutput {
    text: string
    imageUrl: string
}

/**
 * Runs a computation and an export for a ShapeDiver Geometry Backend Model, which is 
 * supposed to fulfill the following assumptions: 
 * 
 *   * has a parameter of type "File" which supports images
 *   * has a parameter of type "String"
 *   * has a data output whose lowercase name contains "text"
 *   * has a downloadable export which is supposed to export an image
 * 
 * @param input the parameter (input) values to use
 * @param config the ShapeDiver Geometry Backend Model to use 
 * @returns 
 */
export const runModel = async (input: IRunModelInput, config: IModelConfig) : Promise<IRunModelOutput> => {

    /**
     * Create instance of ShapeDiver Geometry Backend SDK and open session for model
     */
    const sdk = create(config.modelViewUrl)
    const dto = await sdk.session.init(config.ticket)
  
    /**
     * Check for parameters (inputs) and outputs which the model should have according to our assumptions
     */

    // find parameter which accepts image uploads
    const paramImage = Object.keys(dto.parameters)
        .map( id => dto.parameters[id])
        .find( p => p.type === "File" && p.format.find(f => f.startsWith("image/")))
    if (!paramImage) {
        console.debug(dto.parameters)
        throw new Error("Could not find a 'File' parameter which accepts images")
    }

    // find text parameter
    const paramText = Object.keys(dto.parameters)
        .map( id => dto.parameters[id])
        .find( p => p.type === "String" && Number(p.max) >= 140 )
    if (!paramText) {
        console.debug(dto.parameters)
        throw new Error("Could not find a 'String' parameter which accepts strings with a length >= 140 characters")
    }
    
    // find data output whose name includes "text"
    const outputText = Object.keys(dto.outputs)
        .map( id => dto.outputs[id] as ShapeDiverResponseOutputDefinition)
        .find( o => o.name.toLowerCase().includes("text") )
    if (!outputText) {
        console.debug(dto.outputs)
        throw new Error("Could not find a output whose name includes 'text'")
    }

    // find downloadable image export
    const exportImage = Object.keys(dto.exports)
        .map( id => dto.exports[id] as ShapeDiverResponseExportDefinition)
        .find( o => o.type == ShapeDiverResponseExportDefinitionType.DOWNLOAD )
    if (!exportImage) {
        console.debug(dto.exports)
        throw new Error("Could not find an export of type 'download'")
    }

    /**
     * Preparations for sending the customization request
     */

    // check length of input text
    if ( paramText.max < input.text.length ) {
        throw new Error (`The text input parameter does not accept strings whose size exceeds ${paramText.max} (${input.text.length})`)
    }

    // fetch input image
    const imageResponse = await axios.get<ArrayBuffer>(input.imageUrl, {responseType: 'arraybuffer'})
    if (imageResponse.status !== 200) {
        throw new Error (`Could not fetch image from ${input.imageUrl}`)
    }
    const imageArrayBuffer = imageResponse.data
    const imageContentType = imageResponse.headers['content-type']
    if ( !paramImage.format.includes(imageContentType) ) {
        throw new Error (`The image input parameter does not accept image type ${imageContentType}`)
    }
    if ( paramImage.max < imageResponse.data.byteLength ) {
        throw new Error (`The image input parameter does not accept images whose size exceeds ${paramImage.max} (${imageArrayBuffer.byteLength})`)
    }
    
    // upload the image
    const uploadRequest = await sdk.file.requestUpload(dto.sessionId, {[paramImage.id]: {format: imageContentType, size: imageArrayBuffer.byteLength}})
    const uploadDefinition = uploadRequest.asset.file[paramImage.id]
    await sdk.utils.upload(uploadDefinition.href, imageArrayBuffer, imageContentType)
    
    /**
     * Customization and export request
     */

    // send and wait for customization request
    const customizationBody: ShapeDiverRequestCustomization = {
        [paramImage.id]: uploadDefinition.id,
        [paramText.id]: input.text
    }
    const customizationResult = await sdk.utils.submitAndWaitForCustomization(sdk, dto.sessionId, customizationBody)
  
    // check customization result
    const customizationResultContent = (customizationResult.outputs[outputText.id] as ShapeDiverResponseOutput).content
    if (customizationResultContent.length < 1) {
        throw new Error (`Output result content is empty`)
    }

    // send and wait for export request
    const result = await sdk.utils.submitAndWaitForExport(sdk, dto.sessionId, {
        exports: { 
            id: exportImage.id
        },
        parameters: customizationBody,
        // a ShapeDiverError will be thrown in case max_wait_time is exceeded
        max_wait_time: 30000
    })

    // check export result
    const exportResult = result.exports[exportImage.id] as ShapeDiverResponseExport;
    if (exportResult.status_computation !== ShapeDiverResponseModelComputationStatus.SUCCESS) {
        throw new Error (`Export computation failed: ${exportResult.status_computation}`)
    }
    if (exportResult.status_collect !== ShapeDiverResponseModelComputationStatus.SUCCESS) {
        throw new Error (`Saving of export results failed: ${exportResult.status_collect}`)
    }
    const exportResultContent = exportResult.content
    if (exportResultContent.length < 1) {
        throw new Error (`Export result content is empty`)
    }
    
    /**
     * Return results
     */

    return {
        text: customizationResultContent[0].data,
        imageUrl: exportResultContent[0].href
    }
}

