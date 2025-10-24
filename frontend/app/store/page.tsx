interface StorePageProps {
  searchParams: {
    filter?: string;
  };
}

export default function StorePage({ searchParams }: StorePageProps) {
  const isFilteredForSamplePacks = searchParams.filter === "sample-packs";

  return (
    <div className="py-8">
      <h1 className="text-3xl font-bold text-foreground mb-8">
        {isFilteredForSamplePacks ? "Sample Packs" : "Store"}
      </h1>
      <p className="text-foreground/80">
        {isFilteredForSamplePacks
          ? "Browse our collection of high-quality sample packs."
          : "Shop our music releases, sample packs, and merchandise."}
      </p>
      {isFilteredForSamplePacks && (
        <div className="mt-4 text-sm text-foreground/60">
          Filtered to show sample packs only
        </div>
      )}
    </div>
  );
}
