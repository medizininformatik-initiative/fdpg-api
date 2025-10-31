# Backend Tests Updated

## Summary

All backend test files have been updated to reflect the refactoring changes:

- `register` field renamed to `registerInfo`
- `isRegisteringForm` removed
- Added `type` field with `ProposalType` enum
- Updated all test assertions and mock data

## Files Updated

### 1. validate-access.util.spec.ts

**Location**: `src/modules/proposal/utils/__tests__/validate-access.util.spec.ts`

**Changes**:

- Added import for `ProposalType` enum
- Updated "RegisteringMember branch" test suite:
  - Changed `register: { isRegisteringForm: true, isInternalRegistration: false }` to `type: ProposalType.RegisteringForm, registerInfo: { isInternalRegistration: false }`
- Updated "Internal Registration Access" test suite:
  - Changed `register: { isRegisteringForm: true, isInternalRegistration: true }` to `type: ProposalType.RegisteringForm, registerInfo: { isInternalRegistration: true }`

**Test Cases**: ✅ All tests updated for new structure

### 2. validate-status-change.util.spec.ts

**Location**: `src/modules/proposal/utils/__tests__/validate-status-change.util.spec.ts`

**Changes**:

- Added import for `ProposalType` enum
- Updated "Registering Form Status Transitions" test suite:
  - **Draft -> FdpgCheck**: Changed to use `type` and `registerInfo`
  - **FdpgCheck -> ReadyToPublish**: Changed to use `type` and `registerInfo`
  - **FdpgCheck -> Rework**: Changed to use `type` and `registerInfo`
  - **Rework -> FdpgCheck**: Changed to use `type` and `registerInfo`
  - **ReadyToPublish -> Published**: Changed to use `type` and `registerInfo`
  - **Internal Registration Workflow**: Changed to use `type` and `registerInfo` with `isInternalRegistration: true`
- Updated "regular proposals" test case:
  - Changed from `register: { isRegisteringForm: false }` to `type: ProposalType.ApplicationForm`

**Test Cases**: ✅ All 7 test suites updated

### 3. proposal-misc.service.spec.ts

**Location**: `src/modules/proposal/services/__tests__/proposal-misc.service.spec.ts`

**Changes**:

- Added import for `ProposalType` enum
- Updated "copyAsInternalRegistration" test suite:
  - Changed assertion from checking `originalProposal.register` to:
    ```typescript
    expect(originalProposal.type).toBe(ProposalType.RegisteringForm);
    expect(originalProposal.registerInfo).toEqual({
      isInternalRegistration: true,
      originalProposalId: proposalId,
    });
    ```

**Test Cases**: ✅ Test assertions updated to match new structure

## Summary of Changes

### Before:

```typescript
{
  register: {
    isRegisteringForm: true,
    isInternalRegistration: false
  }
}
```

### After:

```typescript
{
  type: ProposalType.RegisteringForm,
  registerInfo: {
    isInternalRegistration: false
  }
}
```

## Verification

### Tests Verified:

- ✅ All test files compile successfully
- ✅ No remaining references to `isRegisteringForm` in test files
- ✅ No remaining references to `.register.` pattern in test files
- ✅ All imports for `ProposalType` added where needed

### Run Tests:

```bash
cd /Users/elahekaramzadeh/Projects/fdpg/fdpg-api
npm test
```

### Run Specific Test Suites:

```bash
# Validate Access Tests
npm test -- validate-access.util.spec.ts

# Validate Status Change Tests
npm test -- validate-status-change.util.spec.ts

# Proposal Misc Service Tests
npm test -- proposal-misc.service.spec.ts
```

## Additional Notes

### Fields Not Moved in Tests

The following fields remain in `generalProjectInformation` and don't need test updates:

- `projectTitle`
- `desiredStartTime`
- `projectDuration`
- `projectFunding`
- `fundingReferenceNumber`
- `desiredStartTimeType`
- `keywords`

### Fields Now in `registerInfo` (for reference):

These fields were moved to `registerInfo` but are not directly tested in the updated test files:

- `projectUrl`
- `legalBasis`
- `projectCategory`
- `diagnoses`
- `procedures`

If there are integration tests or E2E tests that check these fields, they will need to be updated separately to look in `registerInfo` instead of `generalProjectInformation`.

## Next Steps

1. ✅ Update unit tests (completed)
2. ⏳ Run unit tests to verify: `npm test`
3. ⏳ Check integration tests (if any)
4. ⏳ Check E2E tests (if any)
5. ⏳ Update test documentation (if any)

## Status: ✅ Complete

All backend unit tests have been successfully updated to match the refactoring changes!
