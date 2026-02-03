/**
 * NFDI4Health Data Transfer Objects
 *
 * This file contains DTOs for the NFDI4Health (National Research Data Infrastructure for Personal Health Data) API.
 * NFDI4Health provides standardized metadata for health research studies from various registries including
 * ClinicalTrials.gov, DRKS (German Clinical Trials Register), and other international sources.
 *
 * Structure Overview:
 * -------------------
 * The NFDI4Health API returns paginated responses containing study metadata organized as follows:
 *
 * 1. Top Level (Nfdi4HealthResponseDto):
 *    - content: Array of study records
 *    - totalElements: Total number of studies available
 *
 * 2. Study Record (Nfdi4HealthContentItemDto):
 *    - collections: Categories/collections the study belongs to (e.g., "Individual Studies", "COVID-19")
 *    - resource: The main study metadata
 *
 * 3. Resource (Nfdi4HealthResourceDto):
 *    Contains comprehensive study information including:
 *    - Basic metadata: identifier, titles, descriptions, acronyms
 *    - Classification: study type (interventional/non-interventional)
 *    - Contributors: sponsors, investigators, contact persons (organizational or personal)
 *    - Design: detailed study design including populations, eligibility, interventions, outcomes
 *    - Provenance: data source and update information
 *    - Related identifiers: NCT numbers, EudraCT numbers, etc.
 *
 * 4. Design (Nfdi4HealthDesignDto):
 *    The most complex nested structure containing:
 *    - Administrative information: dates, status, ethics approval
 *    - Study arms/groups: experimental vs. control groups
 *    - Eligibility criteria: inclusion/exclusion criteria, age ranges, genders
 *    - Population: countries, sample sizes
 *    - Interventions/Exposures: treatments, drugs, procedures
 *    - Outcomes: primary and secondary endpoints
 *    - Study characteristics: phase, masking, allocation, centers
 *
 * Naming Convention:
 * ------------------
 * All DTOs are prefixed with "Nfdi4Health" to clearly indicate their source and avoid naming conflicts
 * with other data source integrations (e.g., clinicaltrials.gov, PubMed).
 *
 * Validation:
 * -----------
 * DTOs use class-validator decorators for runtime validation:
 * - @IsString(), @IsNumber(), @IsBoolean() for primitive types
 * - @IsArray() for arrays
 * - @IsOptional() for optional fields
 * - @ValidateNested() with @Type() for nested object validation
 *
 * Usage:
 * ------
 * These DTOs are used to:
 * 1. Validate incoming API responses from NFDI4Health
 * 2. Transform raw API data into type-safe TypeScript objects
 * 3. Provide IDE autocomplete and type checking
 * 4. Serialize data for frontend consumption
 *
 * @see https://www.nfdi4health.de/ - NFDI4Health official website
 */

import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// ============================================================================
// Collection DTOs
// ============================================================================

/**
 * Represents a collection/category that a study belongs to.
 * Examples: "Individual Studies", "COVID-19", "Rare Diseases"
 */
export class Nfdi4HealthCollectionDto {
  @IsString()
  alias: string;

  @IsNumber()
  id: number;

  @IsString()
  name: string;
}

// ============================================================================
// Language Text DTOs
// ============================================================================

/**
 * Represents text content in a specific language.
 * Used for multilingual fields like titles, descriptions, and acronyms.
 */
export class Nfdi4HealthLanguageTextDto {
  @IsString()
  language: string;

  @IsString()
  text: string;
}

// ============================================================================
// Classification DTOs
// ============================================================================

/**
 * Classifies the type of research resource (e.g., "Study").
 */
export class Nfdi4HealthClassificationDto {
  @IsString()
  type: string;
}

// ============================================================================
// Contributor DTOs
// ============================================================================

/**
 * Represents an organizational affiliation (institution, university, hospital).
 */
export class Nfdi4HealthAffiliationDto {
  @IsOptional()
  @IsString()
  address?: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  webpage?: string;
}

/**
 * Organizational contributor (sponsor, funding organization).
 */
export class Nfdi4HealthOrganisationalContributorDto {
  @IsString()
  name: string;

  @IsString()
  type: string;
}

/**
 * Personal contributor (principal investigator, researcher, contact person).
 */
export class Nfdi4HealthPersonalContributorDto {
  @IsString()
  familyName: string;

  @IsString()
  givenName: string;

  @IsString()
  type: string;
}

/**
 * Contributor to the study (can be organizational or personal).
 */
export class Nfdi4HealthContributorDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Nfdi4HealthAffiliationDto)
  affiliations?: Nfdi4HealthAffiliationDto[];

  @IsOptional()
  @IsString()
  email?: string;

  @IsString()
  nameType: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => Nfdi4HealthOrganisationalContributorDto)
  organisational?: Nfdi4HealthOrganisationalContributorDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => Nfdi4HealthPersonalContributorDto)
  personal?: Nfdi4HealthPersonalContributorDto;

  @IsOptional()
  @IsString()
  phone?: string;
}

// ============================================================================
// Design DTOs
// ============================================================================

/**
 * Represents an age specification with number and time unit.
 */
export class Nfdi4HealthAgeDto {
  @IsNumber()
  number: number;

  @IsString()
  timeUnit: string;
}

/**
 * Administrative information about the study (dates, status, approvals).
 */
export class Nfdi4HealthAdministrativeInformationDto {
  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsString()
  status: string;

  @IsOptional()
  @IsString()
  ethicsCommitteeApproval?: string;

  @IsOptional()
  @IsString()
  recruitmentStatusRegister?: string;
}

/**
 * Study arm or treatment group (e.g., experimental, active comparator, placebo).
 */
export class Nfdi4HealthArmDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  label: string;

  @IsString()
  type: string;
}

/**
 * Study group for non-interventional studies.
 */
export class Nfdi4HealthGroupDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  label: string;
}

/**
 * Medical condition or disease being studied.
 */
export class Nfdi4HealthConditionDto {
  @IsString()
  classification: string;

  @IsString()
  label: string;
}

/**
 * Data sharing plan for the study.
 */
export class Nfdi4HealthDataSharingPlanDto {
  @IsString()
  generally: string;
}

/**
 * Masking/blinding information (who is blinded in the study).
 */
export class Nfdi4HealthMaskingDto {
  @IsBoolean()
  general: boolean;

  @IsArray()
  @IsString({ each: true })
  roles: string[];
}

/**
 * Interventional study-specific design elements.
 */
export class Nfdi4HealthInterventionalDto {
  @IsOptional()
  @IsString()
  allocation?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => Nfdi4HealthMaskingDto)
  masking?: Nfdi4HealthMaskingDto;

  @IsOptional()
  @IsString()
  phase?: string;
}

/**
 * Non-interventional study-specific design elements.
 */
export class Nfdi4HealthNonInterventionalDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  timePerspectives?: string[];
}

/**
 * Study intervention (drug, device, procedure, behavioral).
 */
export class Nfdi4HealthInterventionDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  name: string;
}

/**
 * Exposure in observational studies.
 */
export class Nfdi4HealthExposureDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  name: string;
}

/**
 * Study outcome measure (primary or secondary endpoint).
 */
export class Nfdi4HealthOutcomeDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  timeFrame?: string;

  @IsString()
  title: string;

  @IsString()
  type: string;
}

/**
 * Eligibility criteria for study participation.
 */
export class Nfdi4HealthEligibilityCriteriaDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => Nfdi4HealthAgeDto)
  ageMin?: Nfdi4HealthAgeDto;

  @IsOptional()
  @IsString()
  exclusionCriteria?: string;

  @IsArray()
  @IsString({ each: true })
  genders: string[];

  @IsOptional()
  @IsString()
  inclusionCriteria?: string;
}

/**
 * Study population characteristics (countries, sample size).
 */
export class Nfdi4HealthPopulationDto {
  @IsArray()
  @IsString({ each: true })
  countries: string[];

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  obtainedSampleSize?: number;

  @IsOptional()
  @IsNumber()
  targetSampleSize?: number;
}

/**
 * Disease categories being studied.
 */
export class Nfdi4HealthGroupsOfDiseasesDto {
  @IsArray()
  @IsString({ each: true })
  generally: string[];
}

/**
 * Classification of study type.
 */
export class Nfdi4HealthStudyTypeDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interventional?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  nonInterventional?: string[];
}

/**
 * Sampling method for the study.
 */
export class Nfdi4HealthSamplingDto {
  @IsOptional()
  @IsString()
  method?: string;
}

/**
 * Comprehensive study design information.
 */
export class Nfdi4HealthDesignDto {
  @ValidateNested()
  @Type(() => Nfdi4HealthAdministrativeInformationDto)
  administrativeInformation: Nfdi4HealthAdministrativeInformationDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => Nfdi4HealthAgeDto)
  ageMin?: Nfdi4HealthAgeDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Nfdi4HealthArmDto)
  arms?: Nfdi4HealthArmDto[];

  @IsOptional()
  @IsString()
  centers?: string;

  @IsOptional()
  @IsNumber()
  centersNumber?: number;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Nfdi4HealthConditionDto)
  conditions: Nfdi4HealthConditionDto[];

  @ValidateNested()
  @Type(() => Nfdi4HealthDataSharingPlanDto)
  dataSharingPlan: Nfdi4HealthDataSharingPlanDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => Nfdi4HealthEligibilityCriteriaDto)
  eligibilityCriteria?: Nfdi4HealthEligibilityCriteriaDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Nfdi4HealthExposureDto)
  exposures?: Nfdi4HealthExposureDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Nfdi4HealthGroupDto)
  groups?: Nfdi4HealthGroupDto[];

  @ValidateNested()
  @Type(() => Nfdi4HealthGroupsOfDiseasesDto)
  groupsOfDiseases: Nfdi4HealthGroupsOfDiseasesDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => Nfdi4HealthInterventionalDto)
  interventional?: Nfdi4HealthInterventionalDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Nfdi4HealthInterventionDto)
  interventions?: Nfdi4HealthInterventionDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => Nfdi4HealthMaskingDto)
  masking?: Nfdi4HealthMaskingDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => Nfdi4HealthNonInterventionalDto)
  nonInterventional?: Nfdi4HealthNonInterventionalDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Nfdi4HealthOutcomeDto)
  outcomes?: Nfdi4HealthOutcomeDto[];

  @ValidateNested()
  @Type(() => Nfdi4HealthPopulationDto)
  population: Nfdi4HealthPopulationDto;

  @IsString()
  primaryDesign: string;

  @IsString()
  primaryPurpose: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => Nfdi4HealthSamplingDto)
  sampling?: Nfdi4HealthSamplingDto;

  @ValidateNested()
  @Type(() => Nfdi4HealthStudyTypeDto)
  studyType: Nfdi4HealthStudyTypeDto;

  @IsString()
  subject: string;
}

// ============================================================================
// Identifier DTOs
// ============================================================================

/**
 * Alternative identifier for the study (NCT number, EudraCT, etc.).
 */
export class Nfdi4HealthIdentifierDto {
  @IsString()
  identifier: string;

  @IsOptional()
  @IsString()
  relationType?: string;

  @IsString()
  scheme: string;
}

/**
 * Keyword associated with the study.
 */
export class Nfdi4HealthKeywordDto {
  @IsString()
  label: string;
}

// ============================================================================
// Provenance DTOs
// ============================================================================

/**
 * Data provenance information (source, last update, submitter).
 */
export class Nfdi4HealthProvenanceDto {
  @IsString()
  dataSource: string;

  @IsString()
  lastUpdatePostedDate: string;

  @IsOptional()
  @IsString()
  lastUpdateSubmittedDate?: string;

  @IsString()
  lastUpdateSubmittedUser: string;
}

// ============================================================================
// Resource DTOs
// ============================================================================

/**
 * Main resource object containing all study metadata.
 */
export class Nfdi4HealthResourceDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Nfdi4HealthLanguageTextDto)
  acronyms?: Nfdi4HealthLanguageTextDto[];

  @ValidateNested()
  @Type(() => Nfdi4HealthClassificationDto)
  classification: Nfdi4HealthClassificationDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Nfdi4HealthContributorDto)
  contributors: Nfdi4HealthContributorDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Nfdi4HealthLanguageTextDto)
  descriptions: Nfdi4HealthLanguageTextDto[];

  @ValidateNested()
  @Type(() => Nfdi4HealthDesignDto)
  design: Nfdi4HealthDesignDto;

  @IsString()
  identifier: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Nfdi4HealthIdentifierDto)
  ids?: Nfdi4HealthIdentifierDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Nfdi4HealthIdentifierDto)
  idsAlternative?: Nfdi4HealthIdentifierDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Nfdi4HealthKeywordDto)
  keywords?: Nfdi4HealthKeywordDto[];

  @IsBoolean()
  nutritionalData: boolean;

  @ValidateNested()
  @Type(() => Nfdi4HealthProvenanceDto)
  provenance: Nfdi4HealthProvenanceDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Nfdi4HealthLanguageTextDto)
  titles: Nfdi4HealthLanguageTextDto[];

  @IsOptional()
  @IsString()
  webpage?: string;
}

// ============================================================================
// Content Item DTOs
// ============================================================================

/**
 * Individual study record containing collections and resource metadata.
 */
export class Nfdi4HealthContentItemDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Nfdi4HealthCollectionDto)
  collections: Nfdi4HealthCollectionDto[];

  @ValidateNested()
  @Type(() => Nfdi4HealthResourceDto)
  resource: Nfdi4HealthResourceDto;
}

// ============================================================================
// Main Response DTO
// ============================================================================

/**
 * Top-level response from NFDI4Health API containing paginated study results.
 */
export class Nfdi4HealthResponseDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Nfdi4HealthContentItemDto)
  content: Nfdi4HealthContentItemDto[];

  @IsNumber()
  totalElements: number;
}
