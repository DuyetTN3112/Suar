export interface TestingAuthState {
    authenticated: boolean;
    email?: string | null;
    currentOrganizationId?: string | null;
    sessionOrganizationId?: string | null;
    systemRole?: string | null;
}
export declare function resolveEffectiveOrganizationId(state: TestingAuthState): string | null;
export declare function shouldReuseTestingSession(state: TestingAuthState | null, requestedEmail: string, requestedOrganizationId?: string): boolean;
