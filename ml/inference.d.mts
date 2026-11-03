export function validateArtifact(artifact: unknown): Record<string, unknown>;
export function createPredictor(artifact: unknown): (features: number[]) => {margin:number;raw_probability:number;probability:number;warning:boolean};
