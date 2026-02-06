import './GradientText.css';

export default function GradientText({
  children,
  className = '',
  colors = ['#ccc', '#fff', '#ccc'],
  animationSpeed = 8,
  showBorder = false
}) {
  const gradientStyle = {
    backgroundImage: `linear-gradient(to right, ${colors.join(', ')})`,
    animationDuration: `${animationSpeed}s`
  };

  return (
    <span className={`gradient-text-wrapper ${showBorder ? 'with-border' : ''} ${className}`}>
      <span className="gradient-text-inner" style={gradientStyle}>
        {children}
      </span>
    </span>
  );
}
