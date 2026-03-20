import { icons } from 'lucide-react';

const toComponentName = (name) => {
    return name.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
};

const Icon = ({ name, size = 18, className = "" }) => {
    const componentName = toComponentName(name);
    const LucideIcon = icons[componentName];
    if (!LucideIcon) return null;
    return <LucideIcon size={size} className={className} strokeWidth={2} />;
};

export default Icon;
