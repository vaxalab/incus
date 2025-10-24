interface ArtistPageProps {
  params: {
    slug: string;
  };
}

export default function ArtistPage({ params }: ArtistPageProps) {
  return (
    <div className="py-8">
      <h1 className="text-3xl font-bold text-foreground mb-8">
        Artist: {params.slug}
      </h1>
      <p className="text-foreground/80">
        Artist details and releases will be displayed here.
      </p>
    </div>
  );
}
