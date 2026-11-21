/** A person's name: letters, spaces, apostrophes, hyphens, and periods. No digits. */
export function personNameError(value) {
  const name = String(value || '').trim().replace(/\s+/g, ' ');
  if (!name) return 'Full name is required.';
  if (name.length < 2 || name.length > 80) return 'Enter a full name between 2 and 80 letters.';
  if (/\d/.test(name) || !/^[\p{L}][\p{L}\s.'-]*$/u.test(name)) {
    return 'Full name can use letters only.';
  }
  return '';
}
