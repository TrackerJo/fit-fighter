import './ShinyText.css';

export default function ShinyText({
  children,
  className = '',
  disabled = false,
  speed = 5,
  color = '#999'
}) {
  return (
    <span
      className={`shiny-text ${disabled ? 'disabled' : ''} ${className}`}
      style={{ '--shiny-speed': `${speed}s`, color }}
    >
      {children}
    </span>
  );
}
