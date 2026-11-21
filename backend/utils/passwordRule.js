const RULE = 'Use at least 8 characters with a letter and a number.';

export function passwordError(value) {
  const password = String(value || '');
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  if (password.length < 8 || !hasLetter || !hasNumber) return RULE;
  return '';
}
