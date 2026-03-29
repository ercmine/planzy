function keyFromLabels(labels) {
    return Object.entries(labels).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join(",");
}
function renderLabels(labelsKey) {
    if (!labelsKey)
        return "";
    const labels = labelsKey.split(",").filter(Boolean).map((item) => item.split("=")).map(([k, v]) => `${k}="${v}"`).join(",");
    return `{${labels}}`;
}
export class OpsMetricsRegistry {
    metrics = new Map();
    defineCounter(name, help) {
        if (!this.metrics.has(name))
            this.metrics.set(name, { type: "counter", help, values: new Map() });
    }
    defineGauge(name, help) {
        if (!this.metrics.has(name))
            this.metrics.set(name, { type: "gauge", help, values: new Map() });
    }
    defineHistogram(name, help, buckets) {
        if (!this.metrics.has(name))
            this.metrics.set(name, { type: "histogram", help, buckets: [...buckets].sort((a, b) => a - b), values: new Map() });
    }
    increment(name, labels = {}, by = 1) {
        const metric = this.metrics.get(name);
        if (!metric || metric.type !== "counter")
            throw new Error(`counter_not_defined:${name}`);
        const key = keyFromLabels(labels);
        metric.values.set(key, (metric.values.get(key) ?? 0) + by);
    }
    setGauge(name, value, labels = {}) {
        const metric = this.metrics.get(name);
        if (!metric || metric.type !== "gauge")
            throw new Error(`gauge_not_defined:${name}`);
        metric.values.set(keyFromLabels(labels), value);
    }
    observe(name, value, labels = {}) {
        const metric = this.metrics.get(name);
        if (!metric || metric.type !== "histogram")
            throw new Error(`histogram_not_defined:${name}`);
        const key = keyFromLabels(labels);
        const row = metric.values.get(key) ?? { buckets: new Map(), sum: 0, count: 0 };
        for (const bucket of metric.buckets) {
            if (value <= bucket)
                row.buckets.set(bucket, (row.buckets.get(bucket) ?? 0) + 1);
        }
        row.sum += value;
        row.count += 1;
        metric.values.set(key, row);
    }
    renderPrometheus() {
        const lines = [];
        for (const [name, metric] of [...this.metrics.entries()].sort(([a], [b]) => a.localeCompare(b))) {
            lines.push(`# HELP ${name} ${metric.help}`);
            lines.push(`# TYPE ${name} ${metric.type === "histogram" ? "histogram" : metric.type}`);
            if (metric.type === "counter" || metric.type === "gauge") {
                for (const [labels, value] of [...metric.values.entries()].sort(([a], [b]) => a.localeCompare(b))) {
                    lines.push(`${name}${renderLabels(labels)} ${value}`);
                }
            }
            else {
                for (const [labels, value] of [...metric.values.entries()].sort(([a], [b]) => a.localeCompare(b))) {
                    let cumulative = 0;
                    for (const bucket of metric.buckets) {
                        cumulative = value.buckets.get(bucket) ?? cumulative;
                        lines.push(`${name}_bucket${renderLabels(labels ? `${labels},le=${bucket}` : `le=${bucket}`)} ${cumulative}`);
                    }
                    lines.push(`${name}_bucket${renderLabels(labels ? `${labels},le=+Inf` : "le=+Inf")} ${value.count}`);
                    lines.push(`${name}_sum${renderLabels(labels)} ${value.sum}`);
                    lines.push(`${name}_count${renderLabels(labels)} ${value.count}`);
                }
            }
        }
        return `${lines.join("\n")}\n`;
    }
}
