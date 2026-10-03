import { Header } from '@/components/Header'

/* The privacy policy is a document parents read, so it sits on the one warm
   light surface: cream paper on the night ground. Headings are Fraunces,
   the body copy is Inter, and there are no controls competing for attention. */
export default function PrivacyPolicy() {
  return (
    <div className="kq-ground min-h-screen w-full">
      <Header title="Privacy Policy" />

      <main className="mx-auto w-full max-w-content px-4 py-8 lg:px-10 lg:py-12">
        <article className="kq-sheet mx-auto max-w-2xl font-body text-base">
          <h1 className="font-display text-3xl text-kq-amber-ink">Privacy Policy</h1>
          <p className="mt-3 text-sm text-kq-amber-ink/70">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <div className="mt-8 space-y-7">
            <section>
              <h2 className="font-display text-xl text-kq-amber-ink">1. Introduction</h2>
              <p className="mt-2 leading-relaxed text-kq-amber-ink/90">
                Welcome to KinderQuill. We respect your privacy and are committed to protecting your
                personal data. This privacy policy will inform you as to how we look after your personal
                data when you visit our website and tell you about your privacy rights and how the law
                protects you.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl text-kq-amber-ink">2. Data We Collect</h2>
              <p className="mt-2 leading-relaxed text-kq-amber-ink/90">
                We may collect, use, store and transfer different kinds of personal data about you which
                we have grouped together as follows:
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 leading-relaxed text-kq-amber-ink/90">
                <li>
                  <strong className="font-semibold text-kq-amber-ink">Identity Data:</strong> includes first
                  name, last name, username or similar identifier (via Google Login).
                </li>
                <li>
                  <strong className="font-semibold text-kq-amber-ink">Contact Data:</strong> includes email
                  address.
                </li>
                <li>
                  <strong className="font-semibold text-kq-amber-ink">Content Data:</strong> includes the
                  stories and books you generate on our platform.
                </li>
                <li>
                  <strong className="font-semibold text-kq-amber-ink">Usage Data:</strong> includes
                  information about how you use our website and services.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-xl text-kq-amber-ink">3. How We Use Your Data</h2>
              <p className="mt-2 leading-relaxed text-kq-amber-ink/90">
                We will only use your personal data when the law allows us to. Most commonly, we will use
                your personal data in the following circumstances:
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 leading-relaxed text-kq-amber-ink/90">
                <li>To register you as a new customer.</li>
                <li>To provide the service of generating and storing your stories.</li>
                <li>To manage our relationship with you.</li>
                <li>
                  To improve our website, products or services, marketing or customer relationships.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-xl text-kq-amber-ink">4. Data Security</h2>
              <p className="mt-2 leading-relaxed text-kq-amber-ink/90">
                We have put in place appropriate security measures to prevent your personal data from
                being accidentally lost, used or accessed in an unauthorized way, altered or disclosed.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl text-kq-amber-ink">5. Contact Us</h2>
              <p className="mt-2 leading-relaxed text-kq-amber-ink/90">
                If you have any questions about this privacy policy, please contact us.
              </p>
            </section>
          </div>
        </article>
      </main>
    </div>
  )
}
