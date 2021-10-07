
/**
 * Async version of Array.forEach
 * @param array 
 * @param callback 
 */
export async function asyncForEach<T> (array: T[], callback: (value: T, index: number, array: T[]) => Promise<any>) {
    for (let i = 0, imax = array.length; i < imax; i++) {
        await callback(array[i], i, array)
    }
}

/**
 * Async version of Array.map
 * @param array 
 * @param callback 
 * @returns 
 */
export async function asyncMap<T, TResult> (array: T[], callback: (value: T, index: number, array: T[]) => Promise<TResult>) : Promise<TResult[]> {
    const results : TResult[] = []
    for (let i = 0, imax = array.length; i < imax; i++) {
        results.push( await callback(array[i], i, array) )
    }
    return results
}

/**
 * Awaitable sleep function
 * @param msecs 
 * @returns 
 */
export async function sleep(msecs : number) : Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, msecs)
    })
}
