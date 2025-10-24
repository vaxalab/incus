import Navigation from "./Navigation";

const Header: React.FC = () => {
  return (
    <header className="w-full border-b-2 border-foreground bg-background flex items-center">
      <div className="border-r-2 border-foreground px-6 py-4">
        <h1 className="text-foreground text-xl font-bold">INCUS</h1>
      </div>
      <div className="flex-1 px-6">
        <Navigation />
      </div>
      <div className="px-6">
        search & cart
      </div>
    </header>
  );
};

export default Header;
