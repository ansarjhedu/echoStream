const RULE = 'Use at least 8 characters with a letter and a number.';

export function passwordError(value) {
  const password = String(value || '');
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  if (password.length < 8 || !hasLetter || !hasNumber) return RULE;
  return '';
}

export function passwordStrength(password) {
  if (!password) return { level: '', width: 0, color: '' };
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  if (password.length >= 8 && hasLetter && hasNumber && hasSpecial) {
    return { level: 'Strong', width: 100, color: 'bg-green-500' };
  }
  if (!passwordError(password)) return { level: 'Medium', width: 66, color: 'bg-yellow-500' };
  return { level: 'Weak', width: 33, color: 'bg-red-500' };
}
