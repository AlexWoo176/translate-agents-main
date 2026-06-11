'use strict';

/**
 * Enforces lock policy constraints on glossary terms.
 */
function isTermLocked(existingTerm) {
  if (!existingTerm) return false;
  return existingTerm.locked === true || existingTerm.status === 'locked';
}

function checkLockViolations(existingGlossary, proposedChanges) {
  const violations = [];
  
  for (const proposed of proposedChanges) {
    const termLower = proposed.term.toLowerCase();
    const existing = existingGlossary[termLower];
    
    if (existing && isTermLocked(existing)) {
      // Check if translation or category or status or locked status is being modified
      const translationChanged = proposed.translation !== undefined && proposed.translation !== existing.translation;
      const categoryChanged = proposed.category !== undefined && proposed.category !== existing.category;
      
      // If we are modifying crucial values of a locked term, it is a lock violation
      if (translationChanged || categoryChanged) {
        violations.push({
          term: existing.term || termLower,
          reason: `Term is locked and cannot be modified. Existing translation: "${existing.translation}", Proposed: "${proposed.translation}".`
        });
      }
    }
  }

  return {
    hasViolations: violations.length > 0,
    violations
  };
}

module.exports = {
  isTermLocked,
  checkLockViolations
};
