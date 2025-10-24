"use client";
import React from "react";
import Button from "./Button";

interface SectionTitleProps {
  title: string;
  buttonTitle?: string;
  buttonAlt?: string;
  pageLink?: string;
  onClick?: () => void;
}

const SectionTitle: React.FC<SectionTitleProps> = ({
  title,
  buttonTitle,
  buttonAlt,
  pageLink,
  onClick,
}) => {
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (pageLink) {
      window.location.href = pageLink;
    }
  };

  return (
    <div className="flex items-center justify-between mb-6 p-6">
      <h2 className="text-2xl font-bold text-foreground">{title}</h2>
      {buttonTitle && (
        <Button
          onClick={handleClick}
          title={buttonAlt}
          variant="default"
          size="md"
        >
          {buttonTitle}
        </Button>
      )}
    </div>
  );
};

export default SectionTitle;
