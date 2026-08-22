"use client";

import { createFAQ, editFAQ } from "@/actions/faqActions";
import MyButton from "@/components/MyButton";
import { FAQ } from "@/utils/types";
import { parseServerActionResult } from "@/utils/utils";
import { Label, TextInput, Textarea } from "flowbite-react";
import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";
import toast from "react-hot-toast";
import DeleteFAQButton from "../DeleteFAQButton";
import { FAQ_VALIDATION } from "@/constants/faqs";
import { FAQ_CONTENT_BASE, type BrandAdminScope } from "@/constants/brandAdminScope";

interface FAQEditorProps {
  data?: FAQ;
  category: string;
  brandScope?: BrandAdminScope;
}

export default function FAQEditor(props: FAQEditorProps) {
  const brandScope = props.brandScope ?? "instafarms";
  const faqBase = FAQ_CONTENT_BASE[brandScope];
  const [loading, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = (formData: FormData) => {
    // Add category to form data
    formData.set("category", props.category);

    startTransition(() => {
      let promise: Promise<string>;

      if (props.data) {
        promise = parseServerActionResult(editFAQ(props.data.id, formData, brandScope));
      } else {
        promise = parseServerActionResult(createFAQ(formData, brandScope));
      }

      toast.promise(promise, {
        loading: "Saving FAQ...",
        success: (data) => {
          if (!props.data) {
            router.push(`${faqBase}/${props.category}`);
          }
          return data;
        },
        error: (err) => (err as Error).message,
      });
    });
  };

  useEffect(() => {
    if (props.data) {
      const questionEl = document.getElementById("question") as HTMLInputElement;
      const answerEl = document.getElementById("answer") as HTMLTextAreaElement;
      const categoryEl = document.getElementById("category") as HTMLSelectElement;

      if (questionEl) questionEl.value = props.data.question;
      if (answerEl) answerEl.value = props.data.answer;

      // Set category value if editing and it exists in the data
      if (categoryEl && props.data.category) {
        categoryEl.value = props.data.category;
      }
    }
  }, [props.data]);

  return (
    <form
      action={handleSubmit}
      className="mx-auto flex w-full max-w-2xl flex-col gap-4"
    >


      <div>
        <div className="mb-2 block">
          <Label htmlFor="question">Question <span className="text-red-500">*</span></Label>
        </div>
        <TextInput
          id="question"
          name="question"
          type="text"
          placeholder="Enter question"
          required
        />
      </div>

      <div>
        <div className="mb-2 block">
          <Label htmlFor="answer">Answer <span className="text-red-500">*</span></Label>
        </div>
        <Textarea
          id="answer"
          name="answer"
          placeholder="Enter answer"
          required
          rows={4}
        />
      </div>
      <div className="flex justify-center items-center gap-3">
          <MyButton type="submit" loading={loading}>
            Submit
          </MyButton>
          {
            props.data?.id
              &&
            <div onClick={e => e.preventDefault()}>
              <DeleteFAQButton id={props.data?.id ?? ""} category={props.category} brandScope={brandScope} />
            </div>
          }
      </div>

    </form>
  );
}
