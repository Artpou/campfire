import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";

const faqs = [
  {
    q: "Is Seedarr free?",
    a: "Yes. Seedarr is open-source under the MIT license. Run it on your own hardware with no subscription.",
  },
  {
    q: "Do I need qBittorrent or another download client?",
    a: "No. Seedarr includes a built-in WebTorrent client. Search torrents through Jackett, Prowlarr, or Stremio addons, then download and stream from the same UI.",
  },
  {
    q: "Can I watch while a file is still downloading?",
    a: "Yes. Progressive streaming lets you play before the download finishes. Optional FFmpeg live remux helps with progressive MP4; movi-player also plays MKV/HEVC/AV1/HDR natively in the browser.",
  },
  {
    q: "How do users and permissions work?",
    a: "The first registered user becomes the owner. Roles are owner, admin, member, and viewer. The library is shared for browsing and streaming; pause, delete, and transfer require ownership or admin.",
  },
  {
    q: "What about remote storage?",
    a: "You can offload completed downloads to FTP/FTPS or WebDAV targets — useful for a NAS, Nextcloud, or any remote path you already use.",
  },
  {
    q: "Is Seedarr affiliated with TMDB or Stremio?",
    a: "No. Seedarr uses the TMDB API but is not endorsed or certified by TMDB. It is not affiliated with Stremio, Prowlarr, or Jackett.",
  },
];

export default function Faq() {
  return (
    <Accordion type="single" collapsible className="border-border bg-card/50 w-full rounded-xl border px-5">
      {faqs.map((item, index) => (
        <AccordionItem key={item.q} value={`item-${index}`}>
          <AccordionTrigger className="hover:no-underline">{item.q}</AccordionTrigger>
          <AccordionContent>{item.a}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
