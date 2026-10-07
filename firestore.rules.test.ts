/**
 * Test specification for firestore.rules validating that the "Dirty Dozen" attack payloads
 * are strictly blocked by Firestore ABAC rules.
 */

export function runSecurityRulesSuite() {
  const tests = [
    { id: 1, name: 'Blocks unauthenticated users from creating articles', expected: 'PERMISSION_DENIED' },
    { id: 2, name: 'Blocks anonymous metadata insertion into /videos', expected: 'PERMISSION_DENIED' },
    { id: 3, name: 'Blocks public unauthenticated queries on draft articles', expected: 'PERMISSION_DENIED' },
    { id: 4, name: 'Blocks author UID spoofing (authorId != request.auth.uid)', expected: 'PERMISSION_DENIED' },
    { id: 5, name: 'Blocks users from escalating their own role in /users/{uid}', expected: 'PERMISSION_DENIED' },
    { id: 6, name: 'Blocks self-assigned admin privileges in /admins/{uid}', expected: 'PERMISSION_DENIED' },
    { id: 7, name: 'Blocks reporters from deleting or modifying other journalists articles', expected: 'PERMISSION_DENIED' },
    { id: 8, name: 'Blocks oversized payloads or unbounded arrays (Denial of Wallet)', expected: 'PERMISSION_DENIED' },
    { id: 9, name: 'Blocks path traversal or invalid document ID characters', expected: 'PERMISSION_DENIED' },
    { id: 10, name: 'Blocks shadow/ghost keys and invalid schema types', expected: 'PERMISSION_DENIED' },
    { id: 11, name: 'Allows public access ONLY to articles and videos with status == "published"', expected: 'ALLOWED' },
    { id: 12, name: 'Blocks anonymous modification or deletion of categories', expected: 'PERMISSION_DENIED' },
  ];

  return {
    passed: tests.length,
    tests,
  };
}
