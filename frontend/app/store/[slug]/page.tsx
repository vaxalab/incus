interface ProductPageProps {
  params: {
    slug: string;
  };
}

export default function ProductPage({ params }: ProductPageProps) {
  return (
    <div className="py-8">
      <h1 className="text-3xl font-bold text-foreground mb-8">
        Product: {params.slug}
      </h1>
      <p className="text-foreground/80">
        Product details, samples, and purchase options will be displayed here.
      </p>
    </div>
  );
}
