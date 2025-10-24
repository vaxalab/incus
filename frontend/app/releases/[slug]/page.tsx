import Container from "@/components/Container";

interface ReleasePageProps {
  params: {
    slug: string;
  };
}

export default function ReleasePage({ params }: ReleasePageProps) {
  return (
    <Container>
      <div className="py-8">
        <h1 className="text-3xl font-bold text-foreground mb-8">
          Release: {params.slug}
        </h1>
        <p className="text-foreground/80">
          Release details, tracks, and purchase options will be displayed here.
        </p>
      </div>
    </Container>
  );
}
