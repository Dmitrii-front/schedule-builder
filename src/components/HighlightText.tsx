interface HighlightTextProps {
  text: string;
  query: string;
}

function HighlightText({ text, query }: HighlightTextProps) {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return <>{text}</>;
  }

  const escapedQuery = normalizedQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escapedQuery})`, "gi");
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === normalizedQuery.toLowerCase() ? (
          <mark className="search-highlight" key={`${part}-${index}`}>
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}

export default HighlightText;
