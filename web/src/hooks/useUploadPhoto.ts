import { useMutation } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { UploadedPhoto } from "../types/api";

export function useUploadPhoto() {
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("photo", file);
      return api.post<UploadedPhoto>("/api/uploads/photos", formData);
    },
  });
}
