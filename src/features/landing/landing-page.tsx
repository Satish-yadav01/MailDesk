import { useState } from 'react';
import { Link } from 'react-router-dom';
import * as Accordion from '@radix-ui/react-accordion';
import { ArrowRight, CheckCircle2, ChevronDown, FileSpreadsheet, ListChecks, Menu, Plug, Plus, Rows3, ShieldCheck, Timer, Wand2, X } from 'lucide-react';
import { Logo } from '@/components/common/logo';
import { Button } from '@/components/ui/button';

const NAV = [{ href: '#home', label: 'Home' }, { href: '#features', label: 'Features' }, { href: '#about', label: 'About' }];

const FEATURES = [
  { icon: ListChecks, title: 'Email list management', text: 'Browse stored records in a paginated table with quick on-page search and sorting.' },
  { icon: Plus, title: 'Single email creation', text: 'Add one record with clear fields, inline validation and server feedback.' },
  { icon: Rows3, title: 'Bulk email creation', text: 'Enter many records, review them, and submit the whole batch in one request.' },
  { icon: FileSpreadsheet, title: 'Excel file import', text: 'Drag in an .xlsx or .xls file and follow its processing status.' },
  { icon: Plug, title: 'API-driven operations', text: 'Every action maps to the Mail Service REST API — nothing is simulated.' },
];

const STEPS = [
  { n: '1', title: 'Add your records', text: 'Type them in, enter a batch, or upload a spreadsheet.' },
  { n: '2', title: 'Submit for processing', text: 'MailDesk sends them to the Mail Service and receives a transaction ID.' },
  { n: '3', title: 'Track and review', text: 'Watch the status update, then see the records in your list.' },
];

const BENEFITS = [
  { icon: Timer, title: 'Work faster', text: 'Bulk entry and spreadsheet import replace one-by-one data entry.' },
  { icon: ShieldCheck, title: 'Validate before you send', text: 'Email format and field checks run in the browser, and server errors are shown clearly.' },
  { icon: Wand2, title: 'Stay organised', text: 'One place to create, import, check and review email records.' },
];

const FAQ = [
  { q: 'Does MailDesk store my data?', a: 'Records are stored by the Mail Service your administrator connects MailDesk to. The browser keeps your authentication token until you log out or it expires.' },
  { q: 'How does sign-in work?', a: 'MailDesk sends login and registration requests to the configured User Service and uses the returned token for protected API requests.' },
  { q: 'Which spreadsheet formats can I import?', a: 'Excel files in .xlsx or .xls format.' },
  { q: 'Can I edit or delete records?', a: 'Not currently. The connected API supports creating, importing and listing records only.' },
  { q: 'Are records processed instantly?', a: 'Creating and importing are asynchronous. You get a transaction ID and can watch its status.' },
];

function PreviewMock() {
  const rows = [['ada@example.com', 'Ada Lovelace', 'UNVERIFIED'], ['grace@example.com', 'Grace Hopper', 'UNVERIFIED'], ['alan@example.com', 'Alan Turing', 'UNVERIFIED']];
  return (
    <figure aria-label="Illustrative dashboard preview" className="mx-auto mt-14 max-w-4xl">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-pop">
        <div className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" /><span className="h-2.5 w-2.5 rounded-full bg-slate-300" /><span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        </div>
        <div className="grid grid-cols-[140px_1fr] text-left sm:grid-cols-[180px_1fr]">
          <div className="space-y-2 border-r border-slate-100 p-4 text-xs text-slate-500">
            <div className="rounded-md bg-brand-50 px-2 py-1.5 font-medium text-brand-700">Dashboard</div>
            {['Email List', 'Create Single', 'Create Multiple', 'Upload Excel'].map((t) => <div key={t} className="px-2 py-1.5">{t}</div>)}
          </div>
          <div className="space-y-4 p-4 sm:p-6">
            <div className="grid grid-cols-3 gap-3">
              {['Records', 'Service', 'Operations'].map((t) => <div key={t} className="rounded-lg border border-slate-100 p-3"><p className="text-[10px] text-slate-400">{t}</p><div className="mt-2 h-3 w-10 rounded bg-slate-200" /></div>)}
            </div>
            <div className="divide-y divide-slate-100 rounded-lg border border-slate-100 text-xs">
              {rows.map(([e, n, s]) => <div key={e} className="flex items-center justify-between px-3 py-2.5"><span className="font-medium text-slate-800">{e}</span><span className="hidden text-slate-500 sm:block">{n}</span><span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">{s}</span></div>)}
            </div>
          </div>
        </div>
      </div>
      <figcaption className="mt-3 text-center text-xs text-slate-400">Illustration with sample data.</figcaption>
    </figure>
  );
}

export function LandingPage() {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white">
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav aria-label="Primary" className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            {NAV.map((n) => <a key={n.href} href={n.href} className="hover:text-slate-900">{n.label}</a>)}
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            <Button asChild variant="ghost"><Link to="/login">Login</Link></Button>
            <Button asChild><Link to="/register">Get Started</Link></Button>
          </div>
          <Button variant="ghost" size="icon" className="md:hidden" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
        {open && (
          <div className="space-y-1 border-t border-slate-100 px-4 py-3 md:hidden">
            {NAV.map((n) => <a key={n.href} href={n.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">{n.label}</a>)}
            <div className="flex gap-2 pt-2"><Button asChild variant="secondary" className="flex-1"><Link to="/login">Login</Link></Button><Button asChild className="flex-1"><Link to="/register">Get Started</Link></Button></div>
          </div>
        )}
      </header>

      <main>
        <section id="home" className="relative overflow-hidden px-4 pb-20 pt-16 text-center sm:px-6 sm:pt-24">
          <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,.12),transparent_65%)]" />
          <p className="mx-auto inline-flex rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">Email record management</p>
          <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight text-slate-900 sm:text-6xl">Manage email records without the spreadsheet chaos</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">Create records one at a time, in bulk, or from an Excel file — then track processing and browse everything in one clean workspace.</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg"><Link to="/register">Get Started <ArrowRight className="h-4 w-4" aria-hidden /></Link></Button>
            <Button asChild size="lg" variant="secondary"><a href="#features">See features</a></Button>
          </div>
          <PreviewMock />
        </section>

        <section id="features" className="bg-slate-50 px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-3xl font-semibold tracking-tight text-slate-900">Everything the Mail Service offers, in one UI</h2>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><Icon className="h-5 w-5" aria-hidden /></span>
                  <h3 className="mt-4 font-semibold text-slate-900">{title}</h3><p className="mt-1.5 text-sm text-slate-600">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="about" className="px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center text-3xl font-semibold tracking-tight text-slate-900">How it works</h2>
            <ol className="mt-12 grid gap-8 md:grid-cols-3">
              {STEPS.map((s) => (
                <li key={s.n} className="text-center"><span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-brand-600 text-lg font-semibold text-white">{s.n}</span>
                  <h3 className="mt-4 font-semibold text-slate-900">{s.title}</h3><p className="mt-1.5 text-sm text-slate-600">{s.text}</p></li>
              ))}
            </ol>
          </div>
        </section>

        <section className="bg-slate-50 px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center text-3xl font-semibold tracking-tight text-slate-900">Built to save time</h2>
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {BENEFITS.map(({ icon: Icon, title, text }) => (
                <div key={title} className="flex gap-4 rounded-2xl bg-white p-6 shadow-card"><Icon className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden /><div><h3 className="font-semibold text-slate-900">{title}</h3><p className="mt-1 text-sm text-slate-600">{text}</p></div></div>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl">
            <h2 className="text-center text-3xl font-semibold tracking-tight text-slate-900">Frequently asked questions</h2>
            <Accordion.Root type="single" collapsible className="mt-10 divide-y divide-slate-200 rounded-2xl border border-slate-200">
              {FAQ.map((f) => (
                <Accordion.Item key={f.q} value={f.q}>
                  <Accordion.Header><Accordion.Trigger className="group flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-medium text-slate-900 hover:bg-slate-50">
                    {f.q}<ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-data-[state=open]:rotate-180" aria-hidden /></Accordion.Trigger></Accordion.Header>
                  <Accordion.Content className="px-5 pb-4 text-sm text-slate-600">{f.a}</Accordion.Content>
                </Accordion.Item>
              ))}
            </Accordion.Root>
          </div>
        </section>

        <section className="px-4 pb-20 sm:px-6">
          <div className="mx-auto max-w-4xl rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 px-6 py-14 text-center text-white">
            <h2 className="text-3xl font-semibold tracking-tight">Ready to tidy up your email records?</h2>
            <ul className="mx-auto mt-5 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-brand-100">
              {['Single & bulk entry', 'Excel import', 'Status tracking'].map((t) => <li key={t} className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" aria-hidden />{t}</li>)}
            </ul>
            <Button asChild size="lg" variant="secondary" className="mt-8"><Link to="/register">Get Started</Link></Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-slate-50 px-4 py-12 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-4">
          <div className="md:col-span-2"><Logo /><p className="mt-3 max-w-xs text-sm text-slate-500">Email record management on top of your Mail Service API.</p></div>
          <div><h3 className="text-sm font-semibold text-slate-900">Navigate</h3><ul className="mt-3 space-y-2 text-sm text-slate-600">
            {NAV.map((n) => <li key={n.href}><a className="hover:text-slate-900" href={n.href}>{n.label}</a></li>)}<li><a className="hover:text-slate-900" href="#faq">FAQ</a></li></ul></div>
          <div><h3 className="text-sm font-semibold text-slate-900">Contact</h3><ul className="mt-3 space-y-2 text-sm text-slate-500"><li>support@your-domain.example</li><li>+00 000 000 0000</li><li>Your address here</li></ul></div>
        </div>
        <p className="mx-auto mt-10 max-w-6xl border-t border-slate-200 pt-6 text-xs text-slate-400">© {new Date().getFullYear()} MailDesk. Contact details above are placeholders.</p>
      </footer>
    </div>
  );
}
