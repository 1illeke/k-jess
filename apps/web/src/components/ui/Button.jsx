import { Link } from 'react-router-dom'
import './Button.css'

/**
 * I like buttons
 * 
 * @param {string} variant - Button style variant: 'primary', 'secondary', 'icon', 'small'
 * @param {string} borderStyle - Border style: 
 *   'solid' (a single solid line), 
 *   'dashed' (a series of short dashes), 
 *   'dotted' (a series of dots), 
 *   'double' (two solid lines), 
 *   'groove' (a carved effect), 
 *   'ridge' (an embossed effect), 
 *   'inset' (a depressed effect), 
 *   'outset' (a raised effect)
 * @param {string} as - Element type: 'button' (default) or 'link'
 * @param {string} to - Navigation path (aka link)
 * @param {function} onClick - Click handler (aka button)
 * @param {string} className - Additional CSS classes
 * @param {string} type - Button type: 'button', 'submit', 'reset'
 * 
 * Examples:
 * <Button variant="primary" borderStyle="solid">Regular Button</Button>
 * <Button to="/page" variant="secondary" borderStyle="dashed">Link Button</Button>
 * <Button variant="icon" borderStyle="dotted" onClick={handler}>Icon</Button>
 */
function Button({ 
  children, 
  variant = 'primary', 
  borderStyle = 'solid',
  as = 'button',
  to,
  onClick, 
  className = '',
  type = 'button',
  ...props 
}) {
  const baseClass = 'btn'
  const variantClass = `btn-${variant}`
  const borderClass = `btn-border-${borderStyle}`
  const classes = `${baseClass} ${variantClass} ${borderClass} ${className}`.trim()

  // Link button if as="link" or if 'to' prop is provided
  if (as === 'link' || to) {
    return (
      <Link 
        to={to}
        className={classes}
        {...props}
      >
        {children}
      </Link>
    )
  }

  return (
    <button 
      className={classes}
      onClick={onClick}
      type={type}
      {...props}
    >
      {children}
    </button>
  )
}

export default Button 