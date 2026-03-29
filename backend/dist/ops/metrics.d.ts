export declare class OpsMetricsRegistry {
    private readonly metrics;
    defineCounter(name: string, help: string): void;
    defineGauge(name: string, help: string): void;
    defineHistogram(name: string, help: string, buckets: number[]): void;
    increment(name: string, labels?: Record<string, string>, by?: number): void;
    setGauge(name: string, value: number, labels?: Record<string, string>): void;
    observe(name: string, value: number, labels?: Record<string, string>): void;
    renderPrometheus(): string;
}
