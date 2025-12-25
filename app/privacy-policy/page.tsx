import { Header } from '@/components/Header'

export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-display">
            <Header title="Privacy Policy" />

            <main className="container mx-auto px-4 py-8 max-w-4xl">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
                    <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-gray-100">Privacy Policy</h1>
                    <p className="mb-4 text-gray-600 dark:text-gray-300">Last updated: {new Date().toLocaleDateString()}</p>

                    <div className="space-y-6 text-gray-700 dark:text-gray-300">
                        <section>
                            <h2 className="text-xl font-bold mb-3 text-gray-800 dark:text-gray-100">1. Introduction</h2>
                            <p>Welcome to KinderQuill. We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you as to how we look after your personal data when you visit our website and tell you about your privacy rights and how the law protects you.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold mb-3 text-gray-800 dark:text-gray-100">2. Data We Collect</h2>
                            <p>We may collect, use, store and transfer different kinds of personal data about you which we have grouped together follows:</p>
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                                <li><strong>Identity Data:</strong> includes first name, last name, username or similar identifier (via Google Login).</li>
                                <li><strong>Contact Data:</strong> includes email address.</li>
                                <li><strong>Content Data:</strong> includes the stories and books you generate on our platform.</li>
                                <li><strong>Usage Data:</strong> includes information about how you use our website and services.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold mb-3 text-gray-800 dark:text-gray-100">3. How We Use Your Data</h2>
                            <p>We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:</p>
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                                <li>To register you as a new customer.</li>
                                <li>To provide the service of generating and storing your stories.</li>
                                <li>To manage our relationship with you.</li>
                                <li>To improve our website, products/services, marketing or customer relationships.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold mb-3 text-gray-800 dark:text-gray-100">4. Data Security</h2>
                            <p>We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorized way, altered or disclosed.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold mb-3 text-gray-800 dark:text-gray-100">5. Contact Us</h2>
                            <p>If you have any questions about this privacy policy, please contact us.</p>
                        </section>
                    </div>
                </div>
            </main>
        </div>
    )
}
