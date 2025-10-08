"use client";

import { DetailsModal } from "@/components/DetailsModal";
import { useSearch } from "@/contexts/SearchContext";

export function GlobalDetailsModal() {
  const { modalItem, closeModal, timeAgoFromMinutes, getMapsLink } =
    useSearch();
  return (
    <DetailsModal
      item={modalItem}
      onClose={closeModal}
      timeAgoFromMinutes={timeAgoFromMinutes}
      getMapsLink={getMapsLink}
    />
  );
}
