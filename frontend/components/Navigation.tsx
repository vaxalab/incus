"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavigationProps {
  className?: string;
}

const Navigation: React.FC<NavigationProps> = ({ className = "" }) => {
  const pathname = usePathname();

  const navLinks = [
    { href: "/artists", label: "Artists" },
    { href: "/releases", label: "Releases" },
    {
      href: "/store?filter=sample-packs",
      label: "Sample Packs",
      matchPath: "/store",
    },
    { href: "/store", label: "Store" },
    { href: "/contact", label: "Contact" },
  ];

  const isCurrentPage = (link: (typeof navLinks)[0]) => {
    const pathToMatch = link.matchPath || link.href.split("?")[0];

    // Check for exact match first
    if (pathname === pathToMatch) return true;

    // Check if current path starts with the nav section (for child pages)
    // e.g., /store/product-123 should make "Store" bold
    if (pathname.startsWith(pathToMatch + "/")) return true;

    return false;
  };

  return (
    <nav className={`flex gap-6 items-center ${className}`}>
      {navLinks.map((link) => (
        <div key={link.href} className="flex items-center">
          <Link
            href={link.href}
            className={`text-foreground hover:line-through transition-all duration-200 ${
              isCurrentPage(link) ? "font-bold" : "font-medium"
            }`}
          >
            {link.label}
          </Link>
        </div>
      ))}
    </nav>
  );
};

export default Navigation;
