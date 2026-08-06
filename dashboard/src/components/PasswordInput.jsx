import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

/** Password field with show/hide eye toggle. */
export default function PasswordInput({
  name,
  value,
  onChange,
  placeholder = 'Password',
  required = false,
  className = '',
  inputClassName = '',
  autoComplete,
}) {
  const [show, setShow] = useState(false);

  return (
    <div className={`relative ${className}`}>
      <input
        type={show ? 'text' : 'password'}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className={`w-full bg-black/40 border border-white/10 p-3 pl-12 pr-12 rounded-xl text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all placeholder-gray-600 ${inputClassName}`}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label={show ? 'Hide password' : 'Show password'}
        onClick={() => setShow((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-cyan-400 p-1"
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
