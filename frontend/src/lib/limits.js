// Suggested limits. Change the numbers here. Conversion numbers must match ConvertController.java.
export const limitsFor = (user) =>
  !user ? { plan: 'Guest', rename: 0, dupes: 0, convert: 0 }
  : user.plan === 'PRO' ? { plan: 'Pro', rename: 500, dupes: Infinity, convert: 50 }
  : { plan: 'Free', rename: 50, dupes: 500, convert: 3 };
