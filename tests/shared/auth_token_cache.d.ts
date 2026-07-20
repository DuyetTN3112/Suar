export interface TestingTokenState {
    accessToken: string;
    refreshToken: string;
    organizationId?: string | null;
    systemRole?: string | null;
}
export declare function getCachedTestingToken(email: string, organizationId?: string | null): TestingTokenState | null;
export declare function getAnyCachedTestingToken(email: string): TestingTokenState | null;
export declare function setCachedTestingToken(email: string, state: TestingTokenState, organizationId?: string | null): void;
export declare function clearCachedTestingTokens(email: string): void;
