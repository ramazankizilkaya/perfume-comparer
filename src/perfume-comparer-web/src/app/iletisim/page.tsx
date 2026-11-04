import type { Metadata } from "next";
import { PageBreadcrumb } from "@/components/Breadcrumb";
import ContactForm from "@/components/ContactForm";
import { SITE_NAME, pageMetadata } from "@/lib/seo";
import { contactHref } from "@/lib/urls";

export const metadata: Metadata = pageMetadata({
    title: "İletişim",
    description: `${SITE_NAME} ile iletişime geçin: öneri, hata bildirimi, eksik parfüm veya iş birliği için formu doldurun.`,
    path: contactHref(),
});

export default function ContactPage() {
    return (
        <>
            <PageBreadcrumb trail={[{ label: "İletişim" }]} />

            <section className="block contact-form-block">
                <h1 className="block-title">İletişim formu</h1>
                <ContactForm />
            </section>
        </>
    );
}
