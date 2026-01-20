import { Home } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Breadcrumb as BreadcrumbRoot,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface BreadcrumbProps {
  items: { label: string; href?: string }[];
}

export const Breadcrumb = ({ items }: BreadcrumbProps) => (
  <BreadcrumbRoot className="mb-8">
    <BreadcrumbList>
      <BreadcrumbItem>
        <BreadcrumbLink asChild>
          <Link to="/" className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            <span>Home</span>
          </Link>
        </BreadcrumbLink>
      </BreadcrumbItem>
      
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            {item.href ? (
              <BreadcrumbLink asChild>
                <Link to={item.href}>{item.label}</Link>
              </BreadcrumbLink>
            ) : (
              <BreadcrumbPage>{item.label}</BreadcrumbPage>
            )}
          </BreadcrumbItem>
        </div>
      ))}
    </BreadcrumbList>
  </BreadcrumbRoot>
);












