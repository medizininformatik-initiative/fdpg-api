export enum MigrationMiiLocation {
  BHC = 'BHC',
  MRI = 'MRI',
  KUM = 'KUM',
  UKT = 'UKT',
  UKU = 'UKU',
  UKR = 'UKR',
  UKS = 'UKS',
  UKAU = 'UKAU',
  Charité = 'Charité',
  UMG = 'UMG',
  MHH = 'MHH',
  UKHD = 'UKHD',
  UKSH = 'UKSH',
  UKK = 'UKK',
  UKM = 'UKM',
  UKW = 'UKW',
  UKDD = 'UKDD',
  UKEr = 'UKEr',
  UKF = 'UKF',
  UKFR = 'UKFR',
  UKGI = 'UKGI',
  UKMR = 'UKMR',
  UKG = 'UKG',
  UMMD = 'UMMD',
  UM = 'UM',
  UMM = 'UMM',
  UKA = 'UKA',
  UKB = 'UKB',
  UME = 'UME',
  UKH = 'UKH',
  UKE = 'UKE',
  UKJ = 'UKJ',
  UKL = 'UKL',
  UMR = 'UMR',
  UKD = 'UKD',
  UKRUB = 'UKRUB',
  KC = 'KC',
  CTK = 'CTK',
  UKOWL = 'UKOWL',
  UOL = 'UOL',
  VIV = 'VIV',
}

export const INACTIVE_LOCATIONS = [MigrationMiiLocation.UKD, MigrationMiiLocation.UKRUB];
export const ALL_LOCATIONS = Object.values(MigrationMiiLocation);

export interface IMigrationMiiLocationInfo {
  display: string;
  definition: string;
}

export const MIGRATION_MII_LOCATIONS: Record<MigrationMiiLocation, IMigrationMiiLocationInfo> = {
  [MigrationMiiLocation.BHC]: { display: 'Bosch Health Campus', definition: 'HiGHmed' },

  [MigrationMiiLocation.MRI]: {
    // Actual new identifier: 'TUM'
    display: 'Klinikum der Technischen Universität München',
    definition: 'DIFUTURE',
  },

  [MigrationMiiLocation.KUM]: { display: 'LMU Klinikum', definition: 'DIFUTURE' },

  [MigrationMiiLocation.UKT]: { display: 'Universitätsklinikum Tübingen', definition: 'DIFUTURE' },

  [MigrationMiiLocation.UKU]: { display: 'Universitätsklinikum Ulm', definition: 'DIFUTURE' },

  [MigrationMiiLocation.UKR]: { display: 'Universitätsklinikum Regensburg', definition: 'DIFUTURE' },

  [MigrationMiiLocation.UKS]: {
    display: 'Universität des Saarlandes / Universitätsklinikum des Saarlandes',
    definition: 'DIFUTURE',
  },

  [MigrationMiiLocation.UKAU]: { display: 'Universitätsklinikum Augsburg', definition: 'DIFUTURE' },

  [MigrationMiiLocation.Charité]: { display: 'Charité - Universitätsmedizin Berlin', definition: 'HiGHmed' },

  [MigrationMiiLocation.UMG]: { display: 'Universitätsmedizin Göttingen', definition: 'HiGHmed' },

  [MigrationMiiLocation.MHH]: { display: 'Medizinische Hochschule Hannover', definition: 'HiGHmed' },

  [MigrationMiiLocation.UKHD]: { display: 'Universitätsklinikum Heidelberg', definition: 'HiGHmed' },

  [MigrationMiiLocation.UKSH]: { display: 'Universitätsklinikum Schleswig-Holstein', definition: 'HiGHmed' },

  [MigrationMiiLocation.UKK]: { display: 'Universitätsklinikum Köln', definition: 'HiGHmed' },

  [MigrationMiiLocation.UKM]: { display: 'Universität Münster', definition: 'HiGHmed' },

  [MigrationMiiLocation.UKW]: { display: 'Universitätsklinikum Würzburg', definition: 'HiGHmed' },

  [MigrationMiiLocation.UKDD]: { display: 'Technische Universität Dresden', definition: 'MIRACUM' },

  [MigrationMiiLocation.UKEr]: { display: 'Universitätsklinikum Erlangen', definition: 'MIRACUM' },

  [MigrationMiiLocation.UKF]: { display: 'Universitätsklinikum Frankfurt', definition: 'MIRACUM' },

  [MigrationMiiLocation.UKFR]: { display: 'Universitätsklinikum Freiburg', definition: 'MIRACUM' },

  [MigrationMiiLocation.UKGI]: { display: 'Universitätsklinikum Gießen', definition: 'MIRACUM' },

  [MigrationMiiLocation.UKMR]: { display: 'Universitätsklinikum Marburg', definition: 'MIRACUM' },

  [MigrationMiiLocation.UKG]: { display: 'Universitätsmedizin Greifswald', definition: 'MIRACUM' },

  [MigrationMiiLocation.UMMD]: { display: 'Universitätsmedizin Magdeburg', definition: 'MIRACUM' },

  [MigrationMiiLocation.UM]: {
    display: 'Universitätsmedizin der Johannes Gutenberg-Universität Mainz',
    definition: 'MIRACUM',
  },

  [MigrationMiiLocation.UMM]: { display: 'Universitätsklinikum Mannheim', definition: 'MIRACUM' },

  [MigrationMiiLocation.UKA]: { display: 'Universitätsklinikum Aachen', definition: 'SMITH' },

  [MigrationMiiLocation.UKB]: { display: 'Universitätsklinikum Bonn', definition: 'SMITH' },

  [MigrationMiiLocation.UME]: { display: 'Universitätsklinikum Essen', definition: 'SMITH' },

  [MigrationMiiLocation.UKH]: { display: 'Universitätsklinikum Halle (Saale)', definition: 'SMITH' },

  [MigrationMiiLocation.UKE]: { display: 'Universitätsklinikum Hamburg-Eppendorf', definition: 'SMITH' },

  [MigrationMiiLocation.UKJ]: { display: 'Universitätsklinikum Jena', definition: 'SMITH' },

  [MigrationMiiLocation.UKL]: { display: 'Universitätsklinikum Leipzig', definition: 'SMITH' },

  [MigrationMiiLocation.UMR]: { display: 'Universitätsmedizin Rostock', definition: 'SMITH' },

  [MigrationMiiLocation.UKD]: { display: 'Universitätsklinikum Düsseldorf', definition: 'SMITH' },

  [MigrationMiiLocation.UKRUB]: { display: 'Universitätsklinikum der Ruhr-Universität Bochum', definition: 'SMITH' },

  [MigrationMiiLocation.KC]: { display: 'Klinikum Chemnitz gGmbH', definition: 'MIRACUM' },

  [MigrationMiiLocation.CTK]: {
    // Actual new identifier: 'MUL-CT'
    display: 'Medizinische Universität Lausitz - Carl Thiem',
    definition: 'HiGHmed',
  },

  [MigrationMiiLocation.UKOWL]: { display: 'Universitätsklinikum OWL', definition: 'HiGHmed' },

  [MigrationMiiLocation.UOL]: { display: 'Carl von Ossietzky Universität Oldenburg', definition: 'HiGHmed' },

  [MigrationMiiLocation.VIV]: { display: 'Vivantes Netzwerk für Gesundheit GmbH', definition: 'HiGHmed' },
};
