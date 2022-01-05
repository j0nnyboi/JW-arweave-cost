export declare const _setCacheMs: (ms: number) => number;
export declare const _promiseMap: Map<any, any>;
export declare const fetchTokenPrices: (...args: any[]) => any;
export declare const fetchArweaveStorageCost: (...args: any[]) => any;
export declare const calculate: (fileSizes: number[]) => Promise<{
    safecoin: number;
    arweave: number;
    arweavePrice: number;
    safecoinPrice: number;
    exchangeRate: number;
    totalBytes: number;
}>;
