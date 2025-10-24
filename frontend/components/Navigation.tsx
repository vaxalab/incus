import Link from "next/link";

interface NavigationProps {
  className?: string;
}

const Navigation: React.FC<NavigationProps> = ({ className = "" }) => {
  const navLinks = [
    { href: "/artists", label: "Artists" },
    { href: "/releases", label: "Releases" },
    { href: "/store?filter=sample-packs", label: "Sample Packs" },
    { href: "/store", label: "Store" },
    { href: "/contact", label: "Contact" },
  ];

  return (
    <nav className={`flex gap-6 items-center ${className}`}>
      {navLinks.map((link) => (
        <div key={link.href} className="flex items-center">
          <Link
            href={link.href}
            className="text-foreground hover:text-primary transition-colors duration-200 font-medium"
          >
            {link.label}
          </Link>
        </div>
      ))}
    </nav>
  );
};

export default Navigation;
