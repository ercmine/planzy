export class RollingWindow {
    size;
    buffer;
    nextIndex = 0;
    length = 0;
    constructor(size) {
        this.size = size;
        if (!Number.isInteger(size) || size <= 0) {
            throw new Error("RollingWindow size must be a positive integer");
        }
        this.buffer = new Array(size);
    }
    push(x) {
        this.buffer[this.nextIndex] = x;
        this.nextIndex = (this.nextIndex + 1) % this.size;
        this.length = Math.min(this.length + 1, this.size);
    }
    values() {
        if (this.length === 0) {
            return [];
        }
        const startIndex = this.length < this.size ? 0 : this.nextIndex;
        const values = new Array(this.length);
        for (let i = 0; i < this.length; i += 1) {
            const idx = (startIndex + i) % this.size;
            const value = this.buffer[idx];
            if (!value) {
                throw new Error("RollingWindow invariant violated: missing value");
            }
            values[i] = value;
        }
        return values;
    }
    count() {
        return this.length;
    }
}
