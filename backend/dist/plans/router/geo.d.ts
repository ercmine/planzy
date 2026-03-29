interface GeoPoint {
    lat: number;
    lng: number;
}
export declare function haversineMeters(a: GeoPoint, b: GeoPoint): number;
export declare function withinMeters(a: GeoPoint, b: GeoPoint, threshold: number): boolean;
export {};
