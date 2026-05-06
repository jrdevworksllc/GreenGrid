export type Property = { id: string; name: string; city: string; stateCode: string };

export type Zone = { id: string; name: string; sunLevel: string; soilType: string; polygonJson: string };

export type Plant = {
  id: string;
  commonName: string;
  scientificName: string;
  imageUrl?: string | null;
  imageSource?: string | null;
  imageLicense?: string | null;
  imageAttribution?: string | null;
};

export type Planting = {
  id: string;
  commonName: string;
  imageUrl?: string | null;
  quantity: number;
  healthStatus: string;
};

export type Task = { id: string; title: string; detail: string; priority: string; dueOn: string };

export type DesignOutput = { id: string; outputUrl: string; label: string; selected: boolean };

export type DesignRequest = { id: string; outputs: DesignOutput[] };
