import { ChevronRight, Home } from "lucide-react";
import { Link } from "react-router-dom";

interface BreadcrumbProps {
  items: { label: string; href?: string }[];
}

export const Breadcrumb = ({ items }: BreadcrumbProps) => (
  <nav className="flex items-center space-x-2 text-sm mb-6" aria-label="Breadcrumb">
    <Link to="/" className="flex items-center hover:text-primary transition-colors">
      <Home className="w-4 h-4" />
    </Link>
    {items.map((item, index) => (
      <div key={index} className="flex items-center space-x-2">
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
        {item.href ? (
          <Link to={item.href} className="hover:text-primary transition-colors">
            {item.label}
          </Link>
        ) : (
          <span className="text-muted-foreground">{item.label}</span>
        )}
      </div>
    ))}
  </nav>
);
