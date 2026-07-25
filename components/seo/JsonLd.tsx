type JsonLdProps = {
  data: unknown;
};

export function JsonLd({ data }: JsonLdProps) {
  const serializedData = JSON.stringify(data);

  if (!serializedData) {
    return null;
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: serializedData.replace(/</g, '\\u003c'),
      }}
    />
  );
}
