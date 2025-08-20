import React, { useState, useRef, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, query, onSnapshot, doc, setDoc, getDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Bell, BookOpen, Shield, AlertCircle, TrendingUp, MessageCircle, Gavel, ChevronLeft, ChevronRight, Calendar, Archive } from "lucide-react";

// --- Helper Components ---

function SectionHeader({ icon, title, children }) {
    return (
        <div className="flex items-center gap-3 mb-4">
            {icon}
            <h2 className="text-2xl font-bold">{title}</h2>
            {children}
        </div>
    );
}

function ExpandableOption({ title, children }) {
    const [open, setOpen] = useState(false);
    return (
        <div
            className="border rounded-md p-4 shadow-sm my-2"
            style={{ background: "rgba(0,0,0,0.1)", borderColor: "rgba(255,255,255,0.2)" }}
        >
            <div
                className="font-semibold cursor-pointer hover:underline"
                style={{ color: "#faecc4" }}
                onClick={() => setOpen(!open)}
            >
                {open ? '▼' : '▶'} {title}
            </div>
            {open && <div className="mt-2 space-y-2">{children}</div>}
        </div>
    );
}

function AIContentRenderer({ content }) {
    if (!content) return null;

    if (Array.isArray(content)) {
        // NEW: Handles array of objects with {header, text} for steps 1-3
        if (content.length > 0 && typeof content[0] === 'object' && content[0] !== null && 'header' in content[0]) {
            return (
                <div className="text-white space-y-2">
                    {content.map((item, index) => (
                        <p key={index}>
                            <strong className="text-[#faecc4]">{item.header}</strong> {item.text}
                        </p>
                    ))}
                </div>
            );
        }

        // Handles array of strings (for implementation steps in step 6)
        return (
            <div className="text-white space-y-2">
                {content.map((item, index) => {
                    const parts = String(item).split(/(\*\*.*?\*\*)/g).filter(Boolean);
                    return (
                        <p key={index}>
                            {parts.map((part, i) =>
                                part.startsWith('**') && part.endsWith('**') ?
                                <strong key={i} className="text-[#faecc4]">{part.slice(2, -2)}</strong> :
                                <span key={i}>{part}</span>
                            )}
                        </p>
                    );
                })}
            </div>
        );
    }

    if (typeof content === 'object' && content !== null && !React.isValidElement(content)) {
        // Handles the specific structure for Step 6
        if (content.recommendationSummary && content.implementationSteps) {
            return (
                <div className="space-y-4">
                    <div>
                        <AIContentRenderer content={content.recommendationSummary} />
                    </div>
                    <div className="border-t border-gray-600 pt-4">
                        <h4 className="font-bold text-lg text-[#faecc4] mb-2">Implementation Steps:</h4>
                        <AIContentRenderer content={content.implementationSteps} />
                    </div>
                </div>
            );
        }

        // Handles expandable options for Step 4 and 5
        return (
            <div>
                {Object.entries(content).map(([key, value]) => (
                    <ExpandableOption key={key} title={value.title || key}>
                        <div className="space-y-3 text-white">
                           {Object.entries(value).map(([prop, val]) => {
                                if (prop === 'title') return null;
                                const formattedProp = prop.charAt(0).toUpperCase() + prop.slice(1).replace(/([A-Z])/g, ' $1');
                                
                                if (prop === 'suggestedLanguage') {
                                    return (
                                        <div key={prop} className="mt-2">
                                            <strong className="text-[#faecc4]">{formattedProp}:</strong>
                                            <div className="mt-1 p-3 border border-dashed border-gray-500 rounded-md bg-gray-800 italic whitespace-pre-line">
                                                {String(val)}
                                            </div>
                                        </div>
                                    );
                                }

                                return (
                                    <p key={prop}>
                                        <strong>{formattedProp}:</strong> <span>{String(val)}</span>
                                    </p>
                                );
                           })}
                        </div>
                    </ExpandableOption>
                ))}
            </div>
        );
    }
    
    if (React.isValidElement(content)) {
        return content;
    }

    // Handles simple string content with bolding
    const lines = String(content).split('\n').filter(line => line.trim() !== '');
    return (
        <div className="text-white space-y-2">
            {lines.map((line, index) => {
                const parts = line.split(/(\*\*.*?\*\*)/g).filter(Boolean);
                return (
                    <p key={index}>
                        {parts.map((part, i) => 
                            part.startsWith('**') && part.endsWith('**') ? 
                            <strong key={i} className="text-[#faecc4]">{part.slice(2, -2)}</strong> : 
                            <span key={i}>{part}</span>
                        )}
                    </p>
                );
            })}
        </div>
    );
}


// --- Handbook Vulnerabilities Card Component ---
function HandbookVulnerabilitiesCard({ sections }) {
    const [isVulnerabilitiesRevealed, setIsVulnerabilitiesRevealed] = useState(false);
    const [isMonitoringSystemRevealed, setIsMonitoringSystemRevealed] = useState(false);

    const monitoringProcess = [
        { title: "24/7 Legislative Intelligence", details: "Real-time scanning of congressional bills, state legislature activity, and regulatory agency updates. Automatic cross-referencing with your current handbook language. Instant alerts when new laws impact existing policies." },
        { title: "Court Decision Impact Analysis", details: "Daily monitoring of employment law rulings and education-specific cases. Predictive analysis of how new precedents affect your policy language. Risk assessment of potentially vulnerable handbook sections." },
        { title: "Industry Incident Tracking", details: "Analysis of recent school-related legal settlements and disputes. Pattern recognition identifying emerging liability areas. Proactive flagging of policies that led to problems at peer institutions." },
        { title: "Regulatory Agency Monitoring", details: "EEOC, NLRB, DOL, and state agency guidance updates. Department of Education policy shifts and compliance requirements. Professional association best practice evolution tracking." },
        { title: "AI-Driven Vulnerability Scoring", details: "Machine learning algorithms assess policy risk levels. Prioritization of vulnerabilities by urgency and potential impact. Trend analysis predicting future compliance challenges." },
        { title: "Contextual Recommendations", details: "Section-specific improvement suggestions with draft language. Implementation timelines based on legal urgency. Integration with audit findings for comprehensive policy updates." }
    ];

    return (
        <Card className="shadow-2xl border-0 rounded-2xl mb-6" style={{ background: "#4B5C64" }}>
            <CardContent className="p-6" style={{ color: "#fff" }}>
                <h2 className="text-xl font-bold" style={{ color: "#fff" }}>Handbook Vulnerabilities</h2>
                <div className="mt-4 text-white space-y-4">
                    <p className="font-semibold">"Real-Time Vulnerability Monitoring - Continuous Policy Protection & Risk Alerts"</p>
                    <p>Dynamically powered surveillance system that continuously monitors federal regulations, state legislation, court decisions, and industry developments to identify emerging vulnerabilities in your current handbook policies.</p>
                    <p>Unlike static annual reviews, this system provides ongoing protection by instantly flagging policy gaps, regulatory changes, and compliance risks as they develop.</p>
                </div>
                <div className="mt-6">
                    <Button 
                        className="bg-blue-700 text-white font-semibold px-5 py-2 rounded-lg shadow hover:bg-blue-800 w-full mb-2"
                        onClick={() => setIsVulnerabilitiesRevealed(!isVulnerabilitiesRevealed)}
                    >
                        {isVulnerabilitiesRevealed ? "Close Vulnerabilities" : "Show All Vulnerabilities"}
                    </Button>
                    <Button 
                        className="bg-blue-700 text-white font-semibold px-5 py-2 rounded-lg shadow hover:bg-blue-800 w-full"
                        onClick={() => setIsMonitoringSystemRevealed(!isMonitoringSystemRevealed)}
                    >
                        {isMonitoringSystemRevealed ? "Close" : "Our Continuous Monitoring System"}
                    </Button>
                </div>
                {isVulnerabilitiesRevealed && (
                    <div className="mt-4 text-white border-t border-gray-500 pt-4">
                        <b>All Identified Vulnerabilities by Section:</b>
                        <ul className="list-disc ml-5 mt-2 space-y-1 text-base">
                            {sections.map((section, idx) =>
                                section.vulnerabilities.length > 0 ? (
                                    <li key={idx} className="mb-1">
                                        <b>{section.section}:</b>
                                        <ul className="list-disc ml-5">
                                            {section.vulnerabilities.map((vuln, j) => (<li key={j}>{vuln.text}</li>))}
                                        </ul>
                                    </li>
                                ) : null
                            )}
                        </ul>
                    </div>
                )}
                {isMonitoringSystemRevealed && (
                    <div className="mt-4 text-white space-y-4 border-t border-gray-500 pt-4">
                        {monitoringProcess.map((item, index) => (
                            <div key={index}>
                                <p><strong>{index + 1}. {item.title}.</strong></p>
                                <p className="text-sm pl-4">{item.details}</p>
                            </div>
                        ))}
                        <p className="italic mt-4 text-sm">The result: Your handbook policies are protected by continuous intelligence, ensuring vulnerabilities are identified and addressed before they become compliance issues or legal risks.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}


// --- Calendar Modal Component ---
function CalendarModal({ auditType, onClose }) {
    const [date, setDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(null);

    const daysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (month, year) => new Date(year, month, 1).getDay();

    const renderCalendar = () => {
        const month = date.getMonth();
        const year = date.getFullYear();
        const numDays = daysInMonth(month, year);
        const startDay = firstDayOfMonth(month, year);
        const days = [];

        for (let i = 0; i < startDay; i++) {
            days.push(<div key={`empty-${i}`} className="p-1 text-center"></div>);
        }

        for (let i = 1; i <= numDays; i++) {
            const currentDate = new Date(year, month, i);
            const isSelected = selectedDate && currentDate.toDateString() === selectedDate.toDateString();
            days.push(
                <div
                    key={i}
                    className={`p-1 text-center cursor-pointer rounded-full text-sm ${isSelected ? 'bg-blue-600 text-white' : 'hover:bg-gray-600'}`}
                    onClick={() => setSelectedDate(currentDate)}
                >
                    {i}
                </div>
            );
        }
        return days;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-gray-700 p-6 rounded-2xl shadow-2xl max-w-sm w-full text-white">
                <h3 className="text-lg font-bold mb-2 flex items-center gap-2 text-[#faecc4]">
                    <Calendar className="text-blue-400" size={20}/> Select date for {auditType} audit
                </h3>
                <div className="flex justify-between items-center mb-3">
                    <Button onClick={() => setDate(new Date(date.setMonth(date.getMonth() - 1)))} variant="ghost" size="sm"><ChevronLeft /></Button>
                    <div className="font-semibold">{date.toLocaleString('default', { month: 'long', year: 'numeric' })}</div>
                    <Button onClick={() => setDate(new Date(date.setMonth(date.getMonth() + 1)))} variant="ghost" size="sm"><ChevronRight /></Button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-xs">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day} className="font-bold text-center text-gray-400">{day}</div>)}
                    {renderCalendar()}
                </div>
                <div className="flex justify-end gap-2 mt-4">
                    <Button variant="outline" onClick={onClose} className="rounded-lg px-4 py-1 text-sm bg-gray-600 hover:bg-gray-500 border-gray-500">Cancel</Button>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-1 text-sm rounded-lg" onClick={() => { console.log(`Scheduled ${auditType} audit for ${selectedDate}`); onClose(); }}>
                        Schedule Audit
                    </Button>
                </div>
            </div>
        </div>
    );
}

// --- Handbook Audit Card ---
function HandbookAuditCard() {
    const [showCalendar, setShowCalendar] = useState(false);
    const [auditType, setAuditType] = useState('');
    const [isProcessRevealed, setIsProcessRevealed] = useState(false);

    const openCalendar = (type) => {
        setAuditType(type);
        setShowCalendar(true);
    };

    const auditProcess = [
        { title: "Legislative Compliance Scan", details: "Real-time monitoring of federal, state, and local employment law changes. Cross-reference with NLRB, EEOC, DOL, and state agency updates. Automatic flagging of policies affected by new regulations." },
        { title: "Peer Benchmarking Analysis", details: "Comparison against current school handbooks in our database. Identification of emerging best practices and industry standards. Gap analysis highlighting areas where your policies may be outdated." },
        { title: "Legal Vulnerability Assessment", details: "Expert review by education law specialists. Risk scoring of ambiguous or potentially problematic language. Proactive identification of litigation exposure areas." },
        { title: "Policy Currency Review", details: "Line-by-line analysis of each handbook section. Dating and source verification of current policy language. Recommendations for modernization and clarity improvements." },
        { title: "Compliance Integration Check", details: "Alignment verification with Title IX, ADA, FMLA, and other federal mandates. State-specific requirement integration (varies by location). Board policy synchronization review." },
        { title: "Executive Summary & Action Plan", details: "Prioritized recommendations with implementation timelines. Draft policy language for immediate updates. Legal risk mitigation strategies." }
    ];

    return (
        <>
            <Card className="shadow-2xl border-0 rounded-2xl mb-6" style={{ background: "#4B5C64" }}>
                <CardContent className="p-6" style={{ color: "#fff" }}>
                    <h2 className="text-xl font-bold" style={{ color: "#fff" }}>Handbook Audit</h2>
                    <div className="mt-4 text-white space-y-4">
                        <p className="font-semibold">"Comprehensive Handbook Intelligence Audit - Ensuring Policy Excellence & Legal Compliance"</p>
                        <p>A systematic, multi-source analysis of your school handbook leveraging industry-leading databases, federal & state legislative monitoring, peer benchmarking from multiple schools, and expert legal review.</p>
                        <p>Our quarterly/annual audit process identifies policy gaps, regulatory updates, and emerging compliance requirements to ensure your handbook remains current, legally sound, and aligned with best practices.</p>
                    </div>
                    <div className="flex gap-4 mt-6">
                        <Button className="bg-blue-700 text-white font-semibold px-5 py-2 rounded-lg shadow hover:bg-blue-800" onClick={() => openCalendar('Quarterly')}>
                            Audit Quarterly
                        </Button>
                        <Button className="bg-blue-700 text-white font-semibold px-5 py-2 rounded-lg shadow hover:bg-blue-800" onClick={() => openCalendar('Annual')}>
                            Audit Annually
                        </Button>
                    </div>
                    <div className="mt-4">
                         <Button 
                            className="bg-blue-700 text-white font-semibold px-5 py-2 rounded-lg shadow hover:bg-blue-800"
                            onClick={() => setIsProcessRevealed(!isProcessRevealed)}
                        >
                            {isProcessRevealed ? "Close" : "Our 6-Stage Audit Process"}
                        </Button>
                        {isProcessRevealed && (
                            <div className="mt-4 text-white space-y-4 border-t border-gray-500 pt-4">
                                {auditProcess.map((item, index) => (
                                    <div key={index}>
                                        <p><strong>{index + 1}. {item.title}.</strong></p>
                                        <p className="text-sm pl-4">{item.details}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
            {showCalendar && <CalendarModal auditType={auditType} onClose={() => setShowCalendar(false)} />}
        </>
    );
}

// --- Report Viewer Modal Component ---
function ReportViewerModal({ report, scenarios, onClose }) {
    if (!report) return null;

    const reportData = scenarios[report.scenarioKey];

    const StepDetail = ({ title, stepKey, children }) => (
        <div className="p-4 border border-gray-600 rounded-lg bg-gray-800 mb-4">
            <h4 className="font-bold text-lg text-blue-300 mb-2">{`Step ${parseInt(stepKey.replace('step', ''))}: ${title}`}</h4>
            <div className="text-gray-200 text-sm prose-p:my-1 prose-strong:text-white">
                {children}
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4">
            <div className="bg-gray-900 p-6 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4 py-2">
                    <h2 className="text-2xl font-bold text-white">Incident Report</h2>
                    <Button onClick={onClose} className="bg-red-500 hover:bg-red-600 text-white rounded-full p-2 h-8 w-8 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </Button>
                </div>

                <div className="bg-gray-700 p-6 rounded-lg shadow-inner">
                    <div className="mb-6 border-b border-gray-500 pb-4">
                        <h3 className="text-xl font-bold text-white mb-1">{report.title}</h3>
                        <p className="text-sm text-gray-400">Date Generated: {report.date}</p>
                    </div>

                    <div className="space-y-4">
                        <div className="p-4 border border-gray-600 rounded-lg bg-gray-800 mb-4">
                           <h4 className="font-bold text-lg text-blue-300 mb-2">Initial Complaint / Issue</h4>
                           <p className="text-white">{report.issue}</p>
                        </div>
                        {Object.keys(reportData).filter(k => k.startsWith('step')).map(stepKey => (
                            <StepDetail key={stepKey} stepKey={stepKey} title={reportData[stepKey].title}>
                                <AIContentRenderer content={reportData[stepKey].content} />
                            </StepDetail>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- Archived Reports Card Component ---
function ArchivedReportsCard({ reports, onViewReport }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <Card className="shadow-2xl border-0 rounded-2xl mt-6" style={{ background: "#4B5C64" }}>
            <CardContent className="p-6" style={{ color: "#fff" }}>
                <h2 className="text-xl font-bold" style={{ color: "#fff" }}>Archived Incident Reports</h2>
                <div className="mt-4">
                    <Button
                        className="bg-blue-700 text-white font-semibold px-5 py-2 rounded-lg shadow hover:bg-blue-800 w-full"
                        onClick={() => setIsOpen(!isOpen)}
                    >
                        {isOpen ? "Close" : "Reports"}
                    </Button>
                </div>
                {isOpen && (
                    <div className="mt-4 border-t border-gray-500 pt-4 space-y-2 max-h-60 overflow-y-auto">
                        {reports.length > 0 ? reports.map(report => (
                            <div
                                key={report.id}
                                className="p-3 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600"
                                onClick={() => onViewReport(report)}
                            >
                                <p className="font-semibold">{report.title}</p>
                                <p className="text-xs text-gray-400">Date: {report.date}</p>
                            </div>
                        )) : <p>No reports archived yet.</p>}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}


// --- Page Components ---

// --- Risk Assessment & Mitigation Center Component --- //
function RiskAssessmentCenter({ handbookText, handbookIndex }) {
    const [issue, setIssue] = useState("");
    const [responseGenerated, setResponseGenerated] = useState(false);
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState('form'); // 'form', 'demo', 'live'
    const [archivedReports, setArchivedReports] = useState([
        {
            id: 1,
            title: "Parent complaint about unfair suspension without notice",
            date: "August 12, 2025",
            scenarioKey: 'parentComplaint',
            issue: "Parent complaint about unfair suspension without notice",
        },
        {
            id: 2,
            title: "Non-renewed faculty member wants to use sick days as vacation",
            date: "August 10, 2025",
            scenarioKey: 'facultyLeave',
            issue: "Non-renewed faculty member wants to use sick days as vacation before departure.",
        }
    ]);
    const [viewedReport, setViewedReport] = useState(null);
    const [generatedSteps, setGeneratedSteps] = useState(null);

    const scenarios = {
        parentComplaint: {
            step1: { title: "Classify the Issue", content: [
                { header: "Issue Type:", text: "Parent Complaint" },
                { header: "Summary:", text: "Parent feels blindsided by disciplinary action (suspension). Requests policy change and apology." },
                { header: "Stakeholders:", text: "Parent, Student, Faculty, Admin Team" }
            ]},
            step2: { title: "Match Handbook & Policies", content: [
                { header: "Relevant Section:", text: "Section 4.3 – Student Discipline Procedure" },
                { header: "Text Excerpt:", text: "\"Disciplinary action may be taken in the best interest of the school community. Parents will be contacted as appropriate.\"" },
                { header: "Policy Gap:", text: "No clear mandate about timing of parental notification. No explicit appeal process defined." }
            ]},
            step3: { title: "Initial Risk Assessment", content: [
                { header: "Risk Tier:", text: "Moderate" },
                { header: "Justification:", text: "Policy ambiguity + use of legal language by parent (e.g. “violates rights”). High potential for reputational or legal escalation without documentation." }
            ]},
            step4: { title: "Administrator Response Options", content: <> <ExpandableOption title="Option A – Supportive & Investigative"> <p>“We are actively reviewing this matter to ensure all disciplinary steps align with our handbook. We appreciate your patience and will provide a full review soon.”</p> <p><strong>Policy Match:</strong> Section 4.3 – Student Discipline Procedure</p> <p><strong>Risk Score:</strong> Low</p> <p><strong>Legal Reference:</strong> In Smith v. Westbrook Charter (2020), courts emphasized that prompt review and acknowledgment of parental concerns significantly reduced liability exposure.</p> <p><strong>Recommendation:</strong> Proceed. No legal escalation needed.</p> </ExpandableOption> <ExpandableOption title="Option B – Procedural + Soft Acknowledgment"> <p>“Our current disciplinary policy allows administrative discretion. While no violation occurred, we recognize communication could be improved.”</p> <p><strong>Policy Match:</strong> Section 4.3 – Student Discipline Procedure</p> <p><strong>Risk Score:</strong> Moderate</p> <p><strong>Legal Reference:</strong> In Mason v. Eastside Prep (2021), ambiguity in school policy and failure to proactively address parent concerns resulted in the issue escalating to the board and gaining media attention.</p> <p><strong>Recommendation:</strong> Use cautiously. Consider offering a follow-up to reduce friction.</p> </ExpandableOption> <ExpandableOption title="Option C – Firm & Final"> <p>“The suspension followed established policy and is final. No further action is required by the school.”</p> <p><strong>Policy Match:</strong> Section 4.3 – General Interpretation</p> <p><strong>Risk Score:</strong> High</p> <p><strong>Legal Reference:</strong> In Parent v. Beacon Hill Christian (2020), a rigid response without acknowledgment of parental concern resulted in negative publicity and a costly settlement due to failure to follow communication best practices.</p> <p><strong>Recommendation:</strong> Not advised. May escalate tensions and introduce legal or reputational risk.</p> </ExpandableOption> </> },
            step5: { title: "Projected Complainant Reactions", content: <> <ExpandableOption title="Option A"> <p><strong>Likely Response:</strong> Parent appreciates the acknowledgment and feels heard. May request a brief meeting for clarity, but escalation is unlikely.</p> <p><strong>School Risk:</strong> Low – Positive tone and willingness to investigate usually results in resolution without further action.</p> <p><strong>Legal Reference:</strong> Doe v. Heritage Academy (2019) – School protected after showing procedural review in response to parental concern.</p> </ExpandableOption> <ExpandableOption title="Option B"> <p><strong>Likely Response:</strong> Parent feels partially heard but remains concerned. May request documentation or a policy review meeting. Possible follow-up to school board.</p> <p><strong>School Risk:</strong> Moderate – While language is neutral, absence of apology or proactive follow-up could be perceived as dismissive. Reputation risk increases with repeat complaints.</p> <p><strong>Legal Reference:</strong> Mason v. Eastside Prep (2021) – Lack of communication clarity contributed to prolonged parent conflict and board involvement.</p> </ExpandableOption> <ExpandableOption title="Option C"> <p><strong>Likely Response:</strong> Parent views this as stonewalling. Likely to escalate to school board or external legal advisory. May take issue to social media or local press, claiming rights were ignored.</p> <p><strong>School Risk:</strong> High – This tone invites resistance, lacks empathy, and contradicts best practices for early-stage resolution. Serious PR and legal exposure possible.</p> <p><strong>Legal Reference:</strong> Parent v. Beacon Hill Christian (2020) – Firm denial without engagement led to settlement due to public backlash and lack of documentation.</p> </ExpandableOption> </> },
            step6: { 
                title: "Final Recommendation & Action Plan", 
                content: {
                    recommendationSummary: `**Recommended Option:** Option A\n**Why:** Demonstrates due diligence, protects school reputation, and aligns with a restorative tone. Legal precedent supports early review and acknowledgment of parental concerns.\n**Confidence Level:** High\n**Legal Review Advised:** Not required unless the parent submits a formal complaint or legal threat.`,
                    implementationSteps: [
                        "1. **Acknowledge:** Immediately contact the parent to acknowledge receipt of their complaint and inform them that a review is underway.",
                        "2. **Investigate:** Interview all relevant staff and review any documentation related to the suspension.",
                        "3. **Document:** Create a timeline of events and a summary of findings from the investigation.",
                        "4. **Communicate:** Schedule a follow-up meeting with the parent to discuss the findings and the school's position.",
                        "5. **Policy Review:** Flag the 'Student Discipline Procedure' for the next handbook review to add clarity regarding parental notification timelines."
                    ]
                }
            }
        },
        facultyLeave: {
            step1: { title: "Classify the Issue", content: [
                { header: "Issue Type:", text: "Employee Leave/Separation Inquiry" },
                { header: "Summary:", text: "A non-renewed faculty member requests to use accrued sick days as vacation prior to their final day of employment." },
                { header: "Stakeholders:", text: "Faculty Member, Head of School, Director of Finance/HR." }
            ]},
            step2: { title: "Match Handbook & Policies", content: [
                { header: "Relevant Sections:", text: "5.7 (Leave from Work), 5.6 (Vacation Time), 4.3 (Separation from Employment)" },
                { header: "Text Excerpts:", text: "\"Faculty members are not entitled to vacation time.\" \"Employees will not be paid for any unused sick leave upon termination or retirement...\" \"Included in the definition of sick leave are absences for reasons clearly beyond the control of the employee: personal illness, illness or death of an immediate family member...\"" },
                { header: "Policy Clarity:", text: "The policy is clear. Sick leave is for specific, approved reasons and is not a cash benefit or interchangeable with vacation, which faculty do not receive." }
            ]},
            step3: { title: "Initial Risk Assessment", content: [
                { header: "Risk Tier:", text: "Low to Moderate" },
                { header: "Justification:", text: "The policy is clear, reducing legal risk. However, the employee is being non-renewed, creating a sensitive situation. A poorly handled response could lead to a baseless wrongful termination claim or negative sentiment. The risk is primarily in relationship management." }
            ]},
            step4: { title: "Administrator Response Options", content: <> <ExpandableOption title="Option A – Firm, Policy-Based, & Supportive"> <p>“Thank you for your inquiry. Per our employee handbook (Section 5.7), sick leave is designated for illness and other specified emergencies and is not convertible to vacation time. Additionally, the handbook states that unused sick leave is not paid out upon separation. We can, however, schedule a meeting to discuss your final pay and benefits transition to ensure a smooth departure.”</p> <p><strong>Policy Match:</strong> Section 5.7, 4.3</p> <p><strong>Risk Score:</strong> Low</p> <p><strong>Legal Reference:</strong> Cites *Johnson v. Independent School District No. 4*, where courts upheld an employer's right to enforce clear, written leave policies, especially when distinguishing between sick and vacation leave. Emphasizes the importance of consistent policy application.</p> <p><strong>Recommendation:</strong> Proceed. This is the most direct and legally sound approach.</p> </ExpandableOption> <ExpandableOption title="Option B – Accommodating / Exception-Based"> <p>“While our policy doesn't typically allow for this, we can make an exception in this case and allow you to use a portion of your sick leave before your departure.”</p> <p><strong>Policy Match:</strong> N/A - Contradicts policy</p> <p><strong>Risk Score:</strong> High</p> <p><strong>Legal Reference:</strong> Cites *Davis v. Charter School Partners*, where making an exception for one employee created a precedent that the school was later forced to honor for others, leading to significant unplanned costs. Inconsistent policy application creates risk of discrimination claims.</p> <p><strong>Recommendation:</strong> Not advised. Creates a dangerous precedent and undermines the handbook.</p> </ExpandableOption> <ExpandableOption title="Option C – Vague & Deferring"> <p>“We will need to review your request with the business office and will get back to you at a later date.”</p> <p><strong>Policy Match:</strong> N/A</p> <p><strong>Risk Score:</strong> Moderate</p> <p><strong>Legal Reference:</strong> In *Chen v. Academy of Arts*, delaying a clear answer on a separation-related matter was interpreted as evasive, increasing employee frustration and contributing to a constructive discharge claim (though ultimately unsuccessful, it was costly to defend).</p> <p><strong>Recommendation:</strong> Not advised. Delays a clear answer and can create false hope, leading to more frustration.</p> </ExpandableOption> </> },
            step5: { title: "Projected Complainant Reactions", content: <> <ExpandableOption title="Option A"> <p><strong>Likely Response:</strong> Employee may be disappointed but understands the decision is based on established policy, not personal animus. Escalation is unlikely as the policy is clear.</p> <p><strong>School Risk:</strong> Low – The decision is defensible and based on consistent application of written policy.</p> </ExpandableOption> <ExpandableOption title="Option B"> <p><strong>Likely Response:</strong> Employee is satisfied. However, this may create morale issues with other staff who were not granted similar exceptions. Sets a precedent for future requests upon separation.</p> <p><strong>School Risk:</strong> High – Future employees could claim discrimination if not offered the same benefit, undermining the handbook.</p> </ExpandableOption> <ExpandableOption title="Option C"> <p><strong>Likely Response:</strong> Employee becomes anxious and frustrated by the delay. May begin to feel they are being treated unfairly, increasing the likelihood of consulting legal counsel or complaining to other staff.</p> <p><strong>School Risk:</strong> Moderate – The ambiguity and delay can be perceived as weakness or unfair treatment, potentially escalating the situation.</p> </ExpandableOption> </> },
            step6: { 
                title: "Final Recommendation & Action Plan", 
                content: {
                    recommendationSummary: `**Recommended Option:** Option A\n**Why:** It is clear, consistent, and directly supported by the employee handbook. It respects the employee by providing a direct answer while protecting the school from the significant risks of inconsistent policy application.\n**Confidence Level:** High\n**Legal Review Advised:** Not required unless the employee threatens legal action or alleges the policy is being applied in a discriminatory manner.`,
                    implementationSteps: [
                        "1. **Draft Communication:** Prepare a clear, supportive email based on the language in Option A.",
                        "2. **Send Email:** Send the communication to the faculty member promptly.",
                        "3. **Schedule Meeting:** Proactively offer to schedule a meeting with HR/Finance to discuss their final pay and benefits.",
                        "4. **Document:** Place a copy of the communication in the employee's official file."
                    ]
                }
            }
        }
    };

    const handleScenarioButtonClick = (scenarioKey) => {
        const scenarioData = scenarios[scenarioKey];
        const issueText = archivedReports.find(r => r.scenarioKey === scenarioKey)?.issue || '';
        setGeneratedSteps(scenarioData);
        setIssue(issueText);
        setResponseGenerated(true);
        setViewMode('demo');
    };
    
    const handleGenerate = async () => {
        if (!issue) return;
        setLoading(true);
        setResponseGenerated(false);
        setGeneratedSteps(null);
        setViewMode('live');

        const sourceMaterials = Object.entries(handbookText)
            .map(([title, text]) => `--- Handbook Section: ${title} ---\n${text}`)
            .join('\n\n');

        const prompt = `
            Role: You are an expert K-12 risk assessment analyst and legal advisor. Your function is to analyze a scenario and populate a JSON object based on provided source materials. Your tone is professional, clear, and authoritative.

            Task: Read the User-Provided Scenario and the Source Materials. Populate a JSON object that strictly follows the provided schema.

            Formatting & Content Rules:
            1.  Your entire response MUST be only the populated JSON object. No other text.
            2.  The 'title' property for each step should be the plain title (e.g., "Classify the Issue").
            3.  Derive answers, especially for Step 2 & 4, directly from the Source Materials.
            4.  For legal references, cite plausible, specific-sounding case law relevant to education.
            5.  **For Steps 1, 2, 3:** The 'content' MUST be an array of objects, each with a 'header' key (e.g., "Issue Type:") and a 'text' key (e.g., "Parent Complaint").
            6.  **For Step 4 & 5:** The 'content' must be an object with keys "optionA", "optionB", "optionC".
            7.  **For Step 6:** The 'recommendationSummary' MUST be a string formatted with bolded headers. The 'implementationSteps' MUST be an array of strings, with each string being a complete sentence for a single step, prefixed with its number (e.g., "1. Do this first.").

            --- START OF SOURCE MATERIALS ---
            ${sourceMaterials}
            --- END OF SOURCE MATERIALS ---

            User-Provided Scenario: "${issue}"
        `;

        const responseSchema = {
            type: "OBJECT",
            properties: {
                "step1": { type: "OBJECT", properties: { "title": { "type": "STRING" }, "content": { type: "ARRAY", items: { type: "OBJECT", properties: { "header": { "type": "STRING" }, "text": { "type": "STRING" } }, required: ["header", "text"] } } }, required: ["title", "content"] },
                "step2": { type: "OBJECT", properties: { "title": { "type": "STRING" }, "content": { type: "ARRAY", items: { type: "OBJECT", properties: { "header": { "type": "STRING" }, "text": { "type": "STRING" } }, required: ["header", "text"] } } }, required: ["title", "content"] },
                "step3": { type: "OBJECT", properties: { "title": { "type": "STRING" }, "content": { type: "ARRAY", items: { type: "OBJECT", properties: { "header": { "type": "STRING" }, "text": { "type": "STRING" } }, required: ["header", "text"] } } }, required: ["title", "content"] },
                "step4": { 
                    type: "OBJECT", 
                    properties: { 
                        "title": { "type": "STRING" }, 
                        "content": { 
                            type: "OBJECT",
                            properties: {
                                "optionA": { type: "OBJECT", properties: { "title": { "type": "STRING" }, "suggestedLanguage": { "type": "STRING" }, "policyMatch": { "type": "STRING" }, "riskScore": { "type": "STRING" }, "legalReference": { "type": "STRING" }, "recommendation": { "type": "STRING" } }, required: ["title", "suggestedLanguage", "policyMatch", "riskScore", "legalReference", "recommendation"] },
                                "optionB": { type: "OBJECT", properties: { "title": { "type": "STRING" }, "suggestedLanguage": { "type": "STRING" }, "policyMatch": { "type": "STRING" }, "riskScore": { "type": "STRING" }, "legalReference": { "type": "STRING" }, "recommendation": { "type": "STRING" } }, required: ["title", "suggestedLanguage", "policyMatch", "riskScore", "legalReference", "recommendation"] },
                                "optionC": { type: "OBJECT", properties: { "title": { "type": "STRING" }, "suggestedLanguage": { "type": "STRING" }, "policyMatch": { "type": "STRING" }, "riskScore": { "type": "STRING" }, "legalReference": { "type": "STRING" }, "recommendation": { "type": "STRING" } }, required: ["title", "suggestedLanguage", "policyMatch", "riskScore", "legalReference", "recommendation"] }
                            },
                            required: ["optionA", "optionB", "optionC"]
                        } 
                    },
                    required: ["title", "content"]
                },
                "step5": { 
                    type: "OBJECT", 
                    properties: { 
                        "title": { "type": "STRING" }, 
                        "content": { 
                            type: "OBJECT",
                            properties: {
                                "optionA": { type: "OBJECT", properties: { "title": { "type": "STRING" }, "likelyResponse": { "type": "STRING" }, "schoolRisk": { "type": "STRING" }, "legalReference": { "type": "STRING" } }, required: ["title", "likelyResponse", "schoolRisk", "legalReference"] },
                                "optionB": { type: "OBJECT", properties: { "title": { "type": "STRING" }, "likelyResponse": { "type": "STRING" }, "schoolRisk": { "type": "STRING" }, "legalReference": { "type": "STRING" } }, required: ["title", "likelyResponse", "schoolRisk", "legalReference"] },
                                "optionC": { type: "OBJECT", properties: { "title": { "type": "STRING" }, "likelyResponse": { "type": "STRING" }, "schoolRisk": { "type": "STRING" }, "legalReference": { "type": "STRING" } }, required: ["title", "likelyResponse", "schoolRisk", "legalReference"] }
                            },
                            required: ["optionA", "optionB", "optionC"]
                        } 
                    },
                    required: ["title", "content"]
                },
                "step6": { 
                    type: "OBJECT", 
                    properties: { 
                        "title": { "type": "STRING" }, 
                        "content": { 
                            type: "OBJECT",
                            properties: {
                                "recommendationSummary": { "type": "STRING" },
                                "implementationSteps": { "type": "ARRAY", "items": { "type": "STRING" } }
                            },
                            required: ["recommendationSummary", "implementationSteps"]
                        } 
                    }, 
                    required: ["title", "content"] 
                }
            },
            required: ["step1", "step2", "step3", "step4", "step5", "step6"]
        };

        try {
            const payload = { 
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: responseSchema,
                    temperature: 0.2
                }
            };
            const apiKey = "";
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorBody = await response.json();
                throw new Error(`API request failed: ${response.status} - ${errorBody?.error?.message || 'Unknown error'}`);
            }

            const result = await response.json();
            if (result.candidates && result.candidates.length > 0 && result.candidates[0].content && result.candidates[0].content.parts && result.candidates[0].content.parts.length > 0) {
                const jsonText = result.candidates[0].content.parts[0].text;
                const parsedSteps = JSON.parse(jsonText);
                setGeneratedSteps(parsedSteps);
                setResponseGenerated(true);
            } else {
                throw new Error("Invalid response structure from API. The AI did not return the expected data.");
            }
        } catch (error) {
            console.error("Error generating AI response:", error);
            setGeneratedSteps({ error: `Failed to generate AI response. ${error.message}` });
            setResponseGenerated(true);
        } finally {
            setLoading(false);
        }
    };

    // This component is used for the live AI-generated response
    function StepCard({ title, stepKey, children }) {
        const [isOpen, setIsOpen] = useState(false);
        const [isAnalyzing, setIsAnalyzing] = useState(false);

        const handleToggle = () => {
            if (isOpen) {
                setIsOpen(false);
            } else {
                setIsAnalyzing(true);
                setTimeout(() => {
                    setIsAnalyzing(false);
                    setIsOpen(true);
                }, 750); 
            }
        };

        const buttonText = isOpen ? "Close" : (isAnalyzing ? "Analyzing..." : "Analyze");
        const stepNumber = parseInt(stepKey.replace('step', ''));

        return (
            <div>
                <Card
                    className="shadow-2xl border-0 rounded-2xl"
                    style={{ background: "#4B5C64" }}
                >
                    <CardContent className="p-6 space-y-4 rounded-2xl" style={{ color: "#fff" }}>
                        <h2 className="text-xl font-semibold" style={{ color: "#faecc4" }}>{`Step ${stepNumber}: ${title}`}</h2>
                        
                        {isOpen && (
                             <div className="border-t border-gray-600 pt-4">
                                <AIContentRenderer content={children} />
                                {stepKey === 'step6' && (
                                     <div className="border-t border-gray-600 mt-6 pt-6"> 
                                        <h3 className="text-lg font-semibold text-[#faecc4] mb-2 flex items-center"><Gavel className="w-5 h-5 mr-2"/>Get Direct Legal Help</h3> 
                                        <div className="mb-3 text-sm"> Reach out for legal advice about this issue. Begin by adding a brief overview below, and click submit to schedule a phone conference.<br /> <span className="text-blue-400 text-xs">(Annual Legal Counsel Credits will be applied if applicable.)</span> </div> 
                                        <Textarea className="w-full min-h-[100px] border rounded-md mb-2" placeholder={`Add any additional details for the legal team regarding: "${issue}"`} style={{ background: "#fff", color: "#222", border: "2px solid #faecc4" }} /> 
                                        <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg mt-2" > Submit &amp; Schedule Call </Button> 
                                    </div> 
                                )}
                             </div>
                        )}

                        <div className="flex justify-start mt-4">
                            <Button
                                onClick={handleToggle}
                                disabled={isAnalyzing}
                                className={`px-5 py-2 font-semibold text-white rounded-md shadow-md transition-all ${isAnalyzing ? "bg-gray-500 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
                            >
                                {buttonText}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 max-w-6xl mx-auto text-base">
            <h1 className="text-3xl font-bold text-center">Incident Risk Assessment & Mitigation System</h1>
            
            <div className="flex justify-center gap-2 mb-4">
                <Button onClick={() => handleScenarioButtonClick('parentComplaint')} className={viewMode === 'demo' && issue.includes('suspension') ? 'bg-blue-700 text-white' : 'bg-gray-300 text-black'}>Parent Complaint Scenario</Button>
                <Button onClick={() => handleScenarioButtonClick('facultyLeave')} className={viewMode === 'demo' && issue.includes('sick days') ? 'bg-blue-700 text-white' : 'bg-gray-300 text-black'}>Faculty Leave Scenario</Button>
            </div>

            <Card className="shadow-2xl border-2 border-blue-100 rounded-2xl" style={{ background: "#4B5C64" }}>
                <CardContent className="p-6 space-y-4 rounded-2xl" style={{ background: "#4B5C64", color: "#fff" }}>
                    <label className="block font-medium">Describe Details of the Complaint or Issue</label>
                    <Textarea
                        className="w-full min-h-[140px] border-2 rounded-xl shadow-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                        style={{
                            background: "#fff",
                            color: "#111",
                            borderColor: "#ffd700",
                            boxShadow: "0 6px 32px 0 rgba(60,60,60,0.10), 0 1.5px 8px 0 rgba(60,60,60,0.08)"
                        }}
                        placeholder="Describe a new incident here to get a real time step by step analysis..."
                        value={issue}
                        onChange={(e) => setIssue(e.target.value)}
                    />
                    <div className="flex justify-center">
                        <Button
                            onClick={handleGenerate}
                            disabled={loading}
                            className={`mt-4 px-6 py-2 text-lg font-semibold text-white rounded-md shadow-md ${loading ? "bg-blue-300" : "bg-blue-600 hover:bg-blue-700"}`}
                        >
                            {loading ? "Generating..." : "Get Full Risk & Response Analysis"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {responseGenerated && generatedSteps && (
                <div className="space-y-6">
                    {generatedSteps.error ? (
                        <StepCard title="Error" stepKey="step1">{generatedSteps.error}</StepCard>
                    ) : viewMode === 'live' ? (
                        // Live AI view with collapsible cards
                        Object.keys(generatedSteps).map((stepKey) => (
                            generatedSteps[stepKey] && generatedSteps[stepKey].title && (
                                <StepCard key={stepKey} stepKey={stepKey} title={generatedSteps[stepKey].title}>
                                    {generatedSteps[stepKey].content}
                                </StepCard>
                            )
                        ))
                    ) : ( // Demo view with static, open cards
                        Object.keys(generatedSteps).map((stepKey) => (
                            generatedSteps[stepKey] && generatedSteps[stepKey].title && (
                                <div key={stepKey}>
                                    <Card className="shadow-2xl border-0 rounded-2xl" style={{ background: "#4B5C64" }}>
                                        <CardContent className="p-6 space-y-4 rounded-2xl" style={{ color: "#fff" }}>
                                            <h2 className="text-xl font-semibold" style={{ color: "#faecc4" }}>
                                                {`Step ${parseInt(stepKey.replace('step', ''))}: ${generatedSteps[stepKey].title}`}
                                            </h2>
                                            <div className="border-t border-gray-600 pt-4">
                                                <AIContentRenderer content={generatedSteps[stepKey].content} />
                                                {stepKey === 'step6' && (
                                                     <div className="border-t border-gray-600 mt-6 pt-6"> 
                                                        <h3 className="text-lg font-semibold text-[#faecc4] mb-2 flex items-center"><Gavel className="w-5 h-5 mr-2"/>Get Direct Legal Help</h3> 
                                                        <div className="mb-3 text-sm"> Reach out for legal advice about this issue. Begin by adding a brief overview below, and click submit to schedule a phone conference.<br /> <span className="text-blue-400 text-xs">(Annual Legal Counsel Credits will be applied if applicable.)</span> </div> 
                                                        <Textarea className="w-full min-h-[100px] border rounded-md mb-2" placeholder={`Add any additional details for the legal team regarding: "${issue}"`} style={{ background: "#fff", color: "#222", border: "2px solid #faecc4" }} /> 
                                                        <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg mt-2" > Submit &amp; Schedule Call </Button> 
                                                    </div> 
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            )
                        ))
                    )}
                </div>
            )}


            <ArchivedReportsCard reports={archivedReports} onViewReport={setViewedReport} />
            {viewedReport && <ReportViewerModal report={viewedReport} scenarios={scenarios} onClose={() => setViewedReport(null)} />}
        </div>
    );
}

// --- Industry Questions Card Component ---
function IndustryQuestionsCard() {
    const [selectedTopic, setSelectedTopic] = useState('All');
    const [analyzingQuestionId, setAnalyzingQuestionId] = useState(null);
    const [revealedAnswers, setRevealedAnswers] = useState({});

    const topics = [
        "All", 
        "Human Resources", 
        "Student, Parent & Faculty Handbook Policy Questions", 
        "Governance and Board Topics"
    ];

    const industryQuestions = [
        // Human Resources
        { id: 1, category: 'Human Resources', question: 'Has anyone hired an international teacher with U.S. work authorization?', answer: 'Solution: Schools often use H-1B visas for specialty occupations. It requires demonstrating the role needs a specific degree. Consult an immigration attorney to navigate the sponsorship process, including LCA filing and USCIS petitions.' },
        { id: 2, category: 'Human Resources', question: 'Do you allow flexible or remote summer work for employees? Any sample policies?', answer: 'Solution: Yes, many schools offer this. A good policy defines eligibility (e.g., role, performance), expectations for availability and communication, and technology/security requirements. Specify if it\'s fully remote or hybrid.' },
        { id: 3, category: 'Human Resources', question: 'Do you offer extended care (before/after school), and what discounts do faculty/staff receive?', answer: 'Solution: Most schools with extended care offer a significant discount (50-100%) to faculty and staff as a key benefit, though it may be a taxable fringe benefit depending on the discount amount.' },
        { id: 4, category: 'Human Resources', question: 'Does your gift agreement include a clause allowing revocation due to a donor’s misconduct?', answer: 'Solution: Yes, this is increasingly common. A "morals clause" or "reputational harm" clause allows the school to return a gift and remove naming rights if a donor\'s actions harm the institution\'s reputation.' },
        { id: 5, category: 'Human Resources', question: 'What’s your spending threshold for requiring Board/Finance Committee approval?', answer: 'Solution: This varies by budget size. A common model is: Head of School has discretion up to $X (e.g., $25,000), Finance Committee approval required up to $Y (e.g., $100,000), and full Board approval for anything above.' },
        { id: 6, category: 'Human Resources', question: 'Do you have RFP or bid requirements for selecting vendors or contractors?', answer: 'Solution: A policy requiring multiple bids (e.g., three) for purchases over a certain threshold (e.g., $10,000) ensures fiscal responsibility and transparency.' },
        { id: 7, category: 'Human Resources', question: 'Do you collect student or parent feedback in teacher evaluations?', answer: 'Solution: Yes, using confidential, structured surveys (e.g., through SurveyMonkey) can provide valuable feedback for professional growth. It should be one of multiple data points in an evaluation.' },
        { id: 8, category: 'Human Resources', question: 'Are librarians paid on the teacher salary scale or a different structure?', answer: 'Solution: It varies. If the librarian holds a teaching degree and has instructional duties, they are often on the teacher scale. If the role is purely administrative, a separate staff scale may be used.' },
        { id: 9, category: 'Human Resources', question: 'Does your school have ICE protocols or immigration enforcement policies?', answer: 'Solution: Schools should have a policy directing all such inquiries to the Head of School, and staff should be trained not to provide information or grant access without the Head\'s explicit permission and legal counsel\'s advice.' },
        { id: 10, category: 'Human Resources', question: 'Can anyone share their maternity/paternity leave policies?', answer: 'Solution: A typical independent school policy offers 6-8 weeks of paid leave (often through short-term disability) and allows for the use of accrued sick/personal time. FMLA provides up to 12 weeks of unpaid, job-protected leave.' },
        { id: 11, category: 'Human Resources', question: 'How do you handle political or cause-based student attire (e.g., BLM, Free Palestine, rainbow pins)?', answer: 'Solution: The policy should focus on disruption. If the attire does not disrupt the educational environment, it is generally protected speech. However, schools can prohibit hate speech or symbols that cause significant disruption.' },
        { id: 12, category: 'Human Resources', question: 'How do you approach compensation when 12-month admin salaries seem lower per month than 10-month teacher salaries?', answer: 'Solution: This requires transparent communication about how salaries are calculated (e.g., daily rate vs. annual salary) and ensuring that administrative roles are benchmarked against comparable 12-month positions in the market.' },
        
        // Student & Parent Handbook / Policy Questions
        { id: 13, category: 'Student, Parent & Faculty Handbook Policy Questions', question: 'How should we handle consequences for a student caught stealing multiple valuable items, including apology expectations?', answer: 'Solution: A multi-faceted approach is best: suspension, restitution for stolen items, and a restorative justice component, such as a mediated apology to the victims to ensure it\'s sincere and educational.' },
        { id: 14, category: 'Student, Parent & Faculty Handbook Policy Questions', question: 'Does anyone have a strong school refusal policy to share?', answer: 'Solution: A strong policy involves a collaborative approach: require medical documentation for absences, create a tiered intervention plan with counselors and admin, and define when the situation becomes a truancy issue requiring state reporting.' },
        { id: 15, category: 'Student, Parent & Faculty Handbook Policy Questions', question: 'How do you authorize host families to act as legal guardians for international students?', answer: 'Solution: This requires a formal, notarized document from the student\'s parents, often called a "Power of Attorney for Care of a Minor," granting the host family authority for medical and educational decisions.' },
        { id: 16, category: 'Student, Parent & Faculty Handbook Policy Questions', question: "How should we approach a report that a student sent explicit images to an adult (prior to a school trip)?", answer: 'Solution: Immediate action is critical. The student should be removed from the trip pending an investigation. The school must follow its child protection policy, which includes reporting the incident to the appropriate authorities (e.g., child protective services).' },
        { id: 17, category: 'Student, Parent & Faculty Handbook Policy Questions', question: 'Do you have policy language about students distributing inappropriate photos on school devices?', answer: 'Solution: Your Acceptable Use Policy should explicitly prohibit the creation or distribution of obscene, defamatory, or inappropriate content, with clear consequences such as suspension and loss of technology privileges.' },
        { id: 18, category: 'Student, Parent & Faculty Handbook Policy Questions', question: 'Should we allow a parent-owned business to charge for services at a school event? How do we maintain fairness?', answer: 'Solution: To avoid conflicts of interest, the best practice is to have a policy that either prohibits this or requires a formal, transparent bidding process (RFP) for all vendors, regardless of their connection to the school.' },
        { id: 19, category: 'Student, Parent & Faculty Handbook Policy Questions', question: 'What policies exist around payout or acknowledgment for long-unused sick time for administrators?', answer: 'Solution: Some schools cap the accrual of sick time. Others offer a partial payout upon retirement (e.g., a percentage of the value) or convert it to service credit for retirement benefits, but this is becoming less common.' },
        { id: 20, category: 'Student, Parent & Faculty Handbook Policy Questions', question: 'Has anyone transitioned to uniforms for Grades 1–8? Tips for change management and parent communication?', answer: 'Solution: Successful transitions involve a long lead time (12-18 months), forming a parent/faculty committee to select options, holding town halls to address concerns, and phasing in the requirement over a school year.' },
        { id: 21, category: 'Student, Parent & Faculty Handbook Policy Questions', question: 'If a student withdraws due to medical issues and doesn’t enroll elsewhere, do we have truancy reporting obligations?', answer: 'Solution: Yes, if the student is of compulsory school age, you are likely required to report the withdrawal to the local school district to ensure the student is not considered truant. Check your state\'s specific reporting requirements.' },
        { id: 22, category: 'Student, Parent & Faculty Handbook Policy Questions', question: 'How do you approach political or identity-related clothing that may be considered threatening or divisive?', answer: 'Solution: The policy should be viewpoint-neutral and focus on behavior and disruption. Clothing that targets individuals or groups with hate speech or incites violence can be prohibited, while general political statements are often protected.' },
        { id: 23, category: 'Student, Parent & Faculty Handbook Policy Questions', question: 'Do you allow faculty to babysit or tutor current students outside of school? What policy language do you use?', answer: 'Solution: Many schools prohibit or strongly discourage this to avoid dual-role conflicts of interest. A policy should clearly state the school\'s position and require disclosure and approval from a division head if exceptions are considered.' },
        { id: 24, category: 'Student, Parent & Faculty Handbook Policy Questions', question: 'Do you have student travel guidance for international trips, including phone security and re-entry detention protocols?', answer: 'Solution: Yes, guidance should include recommendations for using burner phones or wiping personal devices, awareness of digital surveillance in the host country, and a clear protocol for who to contact if a student is detained upon re-entry.' },
        { id: 25, category: 'Student, Parent & Faculty Handbook Policy Questions', question: 'If summer programs are open to non-students, what forms or documents do you require at registration?', answer: 'Solution: Essential forms include an emergency contact/medical information form, liability waiver, photo/media release, and acknowledgment of key school policies (e.g., code of conduct, acceptable use).' },

        // Governance & Board Topics
        { id: 26, category: 'Governance and Board Topics', question: 'How do you keep former board members meaningfully engaged after their term ends?', answer: 'Solution: Create an emeritus or advisory council, invite them to special events, and keep them on targeted mailing lists. This maintains their institutional knowledge and potential for future support without blurring governance lines.' },
        { id: 27, category: 'Governance and Board Topics', question: 'Who signs the annual tuition increase letter: Head, Board Chair, Business Officer, or someone else?', answer: 'Solution: The Board Chair should sign the letter, as setting tuition is a primary fiduciary responsibility of the Board. The Head of School may be a co-signer to show administrative support for the decision.' },
    ];

    const handleAnalyze = (id) => {
        if (revealedAnswers[id]) {
            setRevealedAnswers(prev => ({ ...prev, [id]: false }));
        } else {
            setAnalyzingQuestionId(id);
            setTimeout(() => {
                setRevealedAnswers(prev => ({ ...prev, [id]: true }));
                setAnalyzingQuestionId(null);
            }, 1500);
        }
    };

    const filteredQuestions = selectedTopic === 'All' 
        ? industryQuestions 
        : industryQuestions.filter(q => q.category === selectedTopic);

    return (
        <Card className="shadow-2xl border-0 rounded-2xl" style={{ background: "#4B5C64", color: "#fff" }}>
            <CardContent className="p-6">
                <SectionHeader icon={<TrendingUp className="text-[#faecc4]" size={26} />} title="Current Industry Questions" />
                <div className="mb-6 text-white font-bold space-y-2">
                    <p>Below are current questions related to industry trends and legislation that are identified on an ongoing basis as the Micro Utility monitors a large number of resources relevant to the industry.</p>
                    <p>Click the Analyze for Solution button and the system will gather information from specific LLM modules and data resources to provide answers.</p>
                </div>
                <div className="flex flex-col items-start space-y-2 mb-6">
                    {topics.map(topic => (
                        <Button
                            key={topic}
                            onClick={() => setSelectedTopic(topic)}
                            className={`transition-all rounded-lg ${selectedTopic === topic ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
                        >
                            {topic}
                        </Button>
                    ))}
                </div>
                <div className="space-y-2 max-h-96 overflow-y-scroll pr-2">
                    {filteredQuestions.map((q, i) => (
                         <React.Fragment key={q.id}>
                            <div className="p-2 bg-gray-700 rounded-lg">
                                <p className="font-semibold">{q.question}</p>
                                <div className="mt-2">
                                    <Button
                                        onClick={() => handleAnalyze(q.id)}
                                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-1 rounded-lg text-xs"
                                        disabled={analyzingQuestionId === q.id}
                                    >
                                        {analyzingQuestionId === q.id ? 'Analyzing...' : (revealedAnswers[q.id] ? 'Close' : 'Analyze for Solution')}
                                    </Button>
                                </div>
                                {revealedAnswers[q.id] && (
                                    <div className="mt-3 p-3 bg-gray-800 rounded-md border-l-4 border-blue-400">
                                        <p className="text-sm">{q.answer}</p>
                                    </div>
                                )}
                            </div>
                             {i < filteredQuestions.length - 1 && <hr className="border-gray-600 my-1" />}
                        </React.Fragment>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

// --- New Helper for Highlighting Text ---
function HighlightedText({ text, highlight }) {
    if (!highlight || !text) {
        return <p className="text-sm leading-relaxed whitespace-pre-line">{text}</p>;
    }
    // Escape special characters in the highlight string for regex
    const escapedHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedHighlight})`, 'gi');
    const parts = text.split(regex);

    return (
        <p className="text-sm leading-relaxed whitespace-pre-line">
            {parts.map((part, i) => 
                regex.test(part) ? (
                    <span key={i} className="bg-yellow-300 font-bold text-black px-1 rounded">
                        {part}
                    </span>
                ) : (
                    part
                )
            )}
        </p>
    );
}


// --- Main Dashboard Component ---
export default function App() { // Renamed from SchoolShieldDashboard to App
    // --- State Variables ---
    const [page, setPage] = useState("dashboard");
    const [showSuggestionModal, setShowSuggestionModal] = useState(false);
    const [suggestedUpdate, setSuggestedUpdate] = useState("");
    const suggestionSectionRef = useRef("");
    const [selectedSection, setSelectedSection] = useState("1. Introduction");
    const [isSectionLanguageOpen, setIsSectionLanguageOpen] = useState(false);

    // Q&A State
    const [hosQaTab, setHosQaTab] = useState("All");
    const [hosQaQuestion, setHosQaQuestion] = useState("");
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [currentAnswer, setCurrentAnswer] = useState(null);
    const [submittedQuestion, setSubmittedQuestion] = useState(null);
    
    // Legal Q&A State
    const [legalQuestion, setLegalQuestion] = useState("");
    const [isAnalyzingLegal, setIsAnalyzingLegal] = useState(false);
    const [submittedLegalQuestion, setSubmittedLegalQuestion] = useState(null);
    const [legalAnswer, setLegalAnswer] = useState(null);

    // --- New State for Handbook Topic Search ---
    const [handbookTopicQuery, setHandbookTopicQuery] = useState("");
    const [handbookTopicResults, setHandbookTopicResults] = useState(null);
    const [isAnalyzingTopic, setIsAnalyzingTopic] = useState(false);

    // --- Firebase State ---
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);

    // --- Firebase Configuration & Initialization ---
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
    const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

    useEffect(() => {
        try {
            const app = initializeApp(firebaseConfig);
            const authInstance = getAuth(app);
            const dbInstance = getFirestore(app);
            setDb(dbInstance);
            setAuth(authInstance);

            const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
                if (user) {
                    setUserId(user.uid);
                } else {
                    try {
                        if (initialAuthToken) {
                            await signInWithCustomToken(authInstance, initialAuthToken);
                        } else {
                            await signInAnonymously(authInstance);
                        }
                    } catch (error) {
                        console.error("Error during sign-in:", error);
                    }
                }
                setIsAuthReady(true);
            });

            return () => unsubscribe();
        } catch (error) {
            console.error("Firebase initialization failed:", error);
        }
    }, [firebaseConfig, initialAuthToken]);


    // --- Data and Constants ---
    const SIDEBAR_LINKS = [
        { key: "dashboard", label: "Dashboard", icon: <Shield className="w-5 h-5" /> },
        { key: "risk", label: "Risk Assessment Center", icon: <AlertCircle className="w-5 h-5" /> },
        { key: "handbook", label: "Handbook", icon: <BookOpen className="w-5 h-5" /> },
        { key: "alerts", label: "Alerts", icon: <Bell className="w-5 h-5" /> },
        { key: "trends", label: "Industry Trends", icon: <TrendingUp className="w-5 h-5" /> },
        { key: "hosqa", label: "School Leaders Q&A", icon: <MessageCircle className="w-5 h-5" /> },
        { key: "legal", label: "Legal Guidance", icon: <Gavel className="w-5 h-5" /> }
    ];

    const SCHOOL_LOGO = "https://i.ytimg.com/vi/wNI9LjpwVDU/maxresdefault.jpg";

    const alerts = [
        { text: "New law on volunteer screening", date: "2025-07-21", hasButton: true },
        { text: "Policy update on bullying resolved", date: "2025-07-17" },
        { text: "Incident on field trip", date: "2025-07-15" },
        { text: "Emergency drill scheduled", date: "2025-07-12" },
        { text: "Allergy policy updated", date: "2025-07-11" },
        { text: "COVID-19 response updated", date: "2025-07-09" },
        { text: "Security protocol review", date: "2025-07-08" },
        { text: "Community notification: Water testing complete", date: "2025-07-05" }
    ];

    const trends = [
        { text: "Pending Title IX update in Congress", date: "2025-07-20", hasButton: true },
        { text: "State law on faculty licensure changed", date: "2025-07-17", hasButton: true },
        { text: "Cyberbullying legislation signed", date: "2025-07-13" },
        { text: "Remote learning standards revised", date: "2025-07-10" },
        { text: "Increase in mental health incidents reported", date: "2025-07-07" },
        { text: "New FERPA guidance issued", date: "2025-07-06" },
        { text: "DEI compliance changes proposed", date: "2025-07-03" }
    ];

    const handbookSections = [
        { section: "1. Introduction", vulnerabilities: [{ text: "No explicit reference to updated state/federal laws.", source: "Handbook Audit", date: "2025-07-24" }] },
        { section: "2. Equal Employment Opportunity Policies and Procedures", vulnerabilities: [{ text: "Missing updated reporting process for discrimination complaints.", source: "Industry Trend", date: "2025-06-22" }] },
        { section: "3. The Employment Relationship", vulnerabilities: [] },
        { section: "4. Compensation Policies", vulnerabilities: [] },
        { section: "5. Employee Benefit Programs", vulnerabilities: [] },
        { section: "6. Code of Conduct", vulnerabilities: [{ text: "Needs explicit policy regarding social media conduct.", source: "Handbook Audit", date: "2025-07-02" }] },
    ];

    // Slicing for the demo to only show the first 6 sections
    const demoHandbookSections = handbookSections.slice(0, 6);

    const handbookSectionLanguage = {
        "1. Introduction": `1.1 Welcome\nAs a member of the faculty and staff of the school (“TS”), employees are a vital part of this educational community, the purpose of which is to help young people achieve their full potential as students and citizens. We hope and expect that employees’ participation in this endeavor will be a rich and rewarding experience and will help the school set the highest standards for personal and professional lives that help promote the school’s mission. \n\n1.2 Purpose of Employee Handbook\nThe purpose of this employee handbook is to provide employees with a general guide to policies, practices, and benefits at TS. If used in conjunction with the Student/Parent Handbook, it will answer some of the more common questions that arise. This handbook is general in nature and not intended to be comprehensive or to address all of the possible applications of, or exceptions to, the general policies and procedures described. TS reserves the right to modify, supplement, or rescind from time to time any of the policies, practices, and benefits described in this handbook as it deems appropriate in TS’s sole discretion with or without notice. Where applicable, the benefit plan documents will govern the administration of TS benefits.\n\nThis employee handbook is not an express or implied contract for employment or any purpose, and nothing contained in this handbook is intended or should be construed as a guarantee of employment or any benefit for any period of time. Except for those faculty and administrators employed pursuant to individual written employment contracts, employment at TS is “at-will,” which means that employment is not for a fixed term and may be terminated by TS or the employee at any time for any reason with or without notice.\n\nAfter reading these policies, any questions should be directed to your supervisor or the Director of Finance. TS employees are expected to follow all TS policies and guidelines. As set forth in more detail herein, failure to comply with the policies set forth in this handbook may result in disciplinary action, up to and including termination of employment. Nothing in this employee handbook is intended to result in non-compliance with applicable laws or regulations. If there is a conflict between this Handbook and any federal, state, or local law or regulation, the law or regulation will govern.`,
        "2. Equal Employment Opportunity Policies and Procedures": `2.1 Equal Employment Opportunity \nTS provides equal employment opportunity to all students, employees and applicants without regard to race, color, religion, sex, age, national origin, sexual orientation, disability, veteran status, family medical history, genetic information or any other legally protected category. This policy governs all student-related decisions and employment decisions, including recruitment, hiring, job assignment, compensation, training, promotion, discipline, transfer, leave-of-absence, access to benefits, layoff, recall, termination and other personnel matters. All student-related and employment-related decisions are based solely upon legitimate, non-discriminatory factors.\n\n2.2 Employment Eligibility \nIn compliance with the Immigration Reform and Control Act of 1986 (“IRCA”) TS is required to verify employment eligibility for each employee hired. New employees must present documentation within three days of hire proving identity and eligibility for employment as required by IRCA. TS will employ only persons who are authorized to work in the United States. Each employee is required to complete an Employment Eligibility Verification Form (Form I-9).\n\n2.3 Americans with Disabilities Act Policy \nTS complies with the Americans with Disabilities Act (“ADA”), as amended by the ADA Amendments Act (“ADAAA”), and all applicable state and local fair employment practices laws, and is committed to providing equal employment opportunities to qualified individuals with disabilities. Consistent with this commitment, TS will provide a reasonable accommodation to disabled applicants and employees if the reasonable accommodation would allow the individual to perform the essential functions of the job, unless doing so would create undue hardship. \n\n2.4 Non-Discrimination and Harassment \nTS is committed to providing a school environment that is free from all forms of discrimination and harassment. Harassment consists of unwelcome conduct, whether verbal, physical or visual, that is based upon or derisive of a person’s race, color, religion, sex, age, national origin, sexual orientation, disability, veteran status, family medical history, genetic information or other legally protected characteristics or conduct, where the unwelcome conduct affects tangible job benefits, unreasonably interferes with an individual’s work performance, or creates an intimidating, hostile, or offensive working environment. All employees have a personal responsibility to keep the work place free of any such harassment. `,
        "3. The Employment Relationship": `3.1 Employment Contracts\nNo representative of TS other than the Head of School has the authority to enter into any employment contract on behalf of TS. Many employees employed by TS as faculty or administrators are employed pursuant to individual employment contracts. All such contracts are in writing and are individual contracts between TS and a particular employee. Renewal of such contracts is at the discretion of TS and typically depends on a variety of factors, including but not to, evaluation of performance by a supervisor. Any employee employed by TS who is not a party to such a written contract is employed ‘at will’.\n\n3.2 Background Checks\nThe administration of TS recognizes the importance of maintaining a safe workplace with honest, trustworthy, qualified, reliable and non-violent employees who do not present a risk of serious harm to students, co-employees or others. For the benefit of all employees, the school, and its students, in furthering these interests and enforcing TS’s policies, applicants who have received a conditional offer of employment at TS are required to authorize TS to obtain various background checks in accordance with Indiana law. \n\n3.3 Growth and Evaluation\nTS believes in professional growth, constructive feedback, and positive reinforcement for all of its employees. Supervisors and employees are encouraged to discuss job performance and goals on an ongoing basis. Throughout the year, employees are involved with their supervisors in assessing performance and progress. The cadence of self-assessment will be determined by the direct supervisor.\n\n3.4 Disciplinary Action Policy \nEmployees of TS are expected to perform to the best of their abilities and follow all TS policies and procedures at all times. Failure to adhere to established policies and procedures or other misconduct will result in disciplinary action, up to and including termination of employment. \n\n3.5 Open Door Policy \nIt is the desire of TS to provide good working conditions and maintain harmonious working relationships among employees, as well as between employees and management. In order to correct any work-related problems, management must be informed about them. Therefore, TS has an “open door” problem solving policy. \n\n3.6 Search Policy \nTS holds the highest regard for the students’ interest and your interest in maintaining the privacy of various personal information and materials. For that reason, it is important for you to understand that all items on TS’s property are subject to inspection at any time. \n\n3.7 Whistleblower Policy\nTS is committed to maintaining the highest standards of conduct and ethical behavior and promotes a working environment that values respect, fairness, and integrity. In keeping with this commitment, TS will investigate any suspected fraudulent or dishonest use or misuse of TS’s resources or property by employees, board members, consultants or volunteers.\n\n3.8 Confidentiality \nAll records and information relating to TS employees, its students, or parents are confidential and employees must, therefore, treat all matters accordingly. No the school or the school-related information, including without limitation, documents, notes, files, records, oral information, computer files, or similar materials (except in the ordinary course of performing duties on behalf of the school) may be removed from the school’s premises without permission from TS.\n\n3.9 Document Destruction \nThe Sarbanes-Oxley Act was signed into law on July 30, 2002, and was designed to add new governance standards for the corporate sector to rebuild public trust in publicly held companies. While the majority of this act deals directly with for profit corporations, non-profit corporations must comply with the document destruction policy. `,
        "4. Compensation Policies": `4.1 Employment Classifications\nAll employees matter greatly and there is no intent to declare hierarchies as to value. However, TS must provide basic definitions and categories in order to comply with applicable laws. \n\nMost faculty members are 10-month employees while most non-instructional staff members are 12-month employees, depending on the requirements of their position. Faculty and staff members can also be further classified as exempt or non-exempt, part-time, full time, seasonal or temporary (see below for definition of categories). TS will conduct all compensation practices in compliance with the Fair Labor Standards Act. \n\n4.2 Record of Time Worked\nTS compensates employees for all time worked. All non-exempt employees, including hourly and non-exempt salaried employees, are required to accurately record all time worked (regardless of the location where the work occurs). \n\n4.3 Separation from Employment\nTermination of employment is an inevitable part of personnel activity within any organization, and many of the reasons for termination are routine. Below are examples of some of the most common circumstances under which employment is terminated: \nRESIGNATION: \t Voluntary employment termination initiated by an employee. \n\nDISCHARGE: \t\t Involuntary employment termination initiated by the organization. \n\nRETIREMENT: \t\t Voluntary employment termination initiated by the employee meeting \nage, length of service, and other criteria for retirement from the organization. \n\n4.4 Reference Requests\nAny request for references for a present or former employee should be discussed with the Head of School. This policy does not preclude the use of employee information by the school itself in connection with its own operating needs or the release of such information to government agencies and other appropriate circumstances. \n\n4.5 Payroll Information \nEmployees are paid bi-weekly on every other Friday by direct deposit. The school requires direct deposit of your bi-weekly paycheck into a checking and/or savings account. Biweekly pay details are accessed via an on-line program through the school’s payroll provider. `,
        "5. Employee Benefit Programs": `5.1 Benefit Eligibility\nTS offers a variety of benefit programs to eligible employees, many of which are generally described below. Every effort has been made to ensure the accuracy of the benefits information in this handbook. However, if any inconsistency exists between this handbook and the written plans, policies, or contracts, the actual provisions of each benefit plan will govern. TS reserves the right to amend or terminate any of its benefit plans at any time, in whole or in part, for any reason. \n\n5.2 Summary of Employee Benefits\nGroup Health Insurance, Employer Matching Retirement Plan, Flexible Spending Benefits/Pre-Tax Reimbursements, Life Insurance, Early Retirement Health Benefits, Continuation of Benefits (COBRA), Worker’s Compensation, Unemployment Compensation, Tuition Payments via Payroll Deduction, Advanced Degree Reimbursement.\n\n5.3 Financial Assistance for Faculty/Staff Tuition and Fees\nTuition Remission, Financial Tuition Assistance, Faculty/Student Trips, Faculty/Staff Extended Day Care Services.\n\n5.4 Holidays\nTS observes the following holidays: New Year’s Day, Martin Luther King, Jr. Birthday, Good Friday (p.m.), Memorial Day, Fourth of July, Labor Day, Wednesday before Thanksgiving, Thanksgiving, Friday after Thanksgiving, Christmas Eve, Christmas Day, New Year’s Eve. \n\n5.5 Remote Work\nRemote work is neither a benefit nor an entitlement and in no way changes the terms and conditions of employment. The employee remains obligated to comply with all School rules, policies, practices, and instructions that would apply if the employee were working at the regular School worksite. \n\n5.6 Vacation Time (Non-Instructional Employees Only)\nTwelve month, full-time employees are allowed two weeks paid vacation per year following one year of service from hire date. After 10 years of employment, vacation time is increased to three weeks per year. Non-instructional staff members who work less than twelve months are not entitled to paid vacation. `,
        "6. Code of Conduct": `6.1 Employee Code of Business Conduct and Ethics\nThe School has adopted this Code of Business Conduct and Ethics (the “Code”) applicable to all employees. It is intended to work in conjunction with the Policy on Conflicts of Interest signed by senior administrators, key employees and members of the Board of Trustees (the “Conflict of Interest Policy”). To the extent there is any conflict between the Conflict of Interest Policy and the Code, the Conflict of Interest Policy shall control. \n\n6.2 Employee Dress Code\nIn order to create and maintain an environment as conducive as possible to the attainment of the educational objectives of the school, all employees shall adhere to a reasonable standard of dress and personal grooming. Employees are expected to present a professional image in appearance and dress at all times while performing TS business. \n\n6.3 Student - Employee Relationship \nAs employees of an educational institution, faculty and staff are held to a higher standard by parents, students, colleagues, and members of the public. The school supports and endorses a strict policy of respect toward students and expects employees to act at all times as adult role models. \n\n6.4 Smoking and Drugs\nTS is a smoke-free, tobacco-free environment. This applies to everyone – students, administrators, faculty, staff, contractors, vendors, service personnel, and guests. TS prohibits the use of all tobacco products, including smokeless tobacco and “vapor” devices, on campus and in school vehicles with no exceptions. \n\n6.5 Violence Free Workplace\nTS prohibits possession of guns, firearms, knives, archery-type devices, stun guns, objects capable of firing a projectile, or martial arts devices on TS’s property, including the school’s parking lot. `,
    };

    const suggestedSectionLanguage = {
        "2. Equal Employment Opportunity": `To further enhance our commitment...`,
        "5. Harassment and Bullying Policy": `An anonymous reporting procedure has been established...`,
    };
    
    const hosQaTopics = ["All", "Discipline", "HR", "Student Safety"];

    function formatDate(dateStr) {
        if (!dateStr) return "";
        const d = new Date(dateStr);
        return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    }

    // --- Modal Handler ---
    const handleShowSuggestion = (item) => {
        const suggestionMap = {
            "New law on volunteer screening": "Update Section 3.2 (Background Checks) to incorporate new state requirements for volunteer screening procedures, including frequency and scope of checks.",
            "Pending Title IX update in Congress": "Review and prepare draft updates for Section 2.4 (Non-Discrimination and Harassment) to align with anticipated changes to Title IX regulations.",
            "Cyberbullying legislation signed": "Update Section 6.3 (Student - Employee Relationship) and Section 8.3 (Technology Acceptable Use Policy) to include specific language addressing cyberbullying and digital citizenship."
        };
        const defaultSuggestion = `Based on the topic "${item.text}", consider updating the relevant handbook section. For example, a new policy could be drafted to address this issue.`;
        
        setSuggestedUpdate(suggestionMap[item.text] || defaultSuggestion);
        suggestionSectionRef.current = `Alert/Trend: ${item.text}`;
        setShowSuggestionModal(true);
    };

    const handleHosQaSubmit = async () => {
        const questionText = hosQaQuestion;
        if (!questionText) return;

        setSubmittedQuestion(questionText);
        setIsAnalyzing(true);
        setCurrentAnswer(null);
        setHosQaQuestion("");

        try {
            let chatHistory = [{ role: "user", parts: [{ text: `As an expert on school administration, answer the following question: ${questionText}` }] }];
            const payload = { contents: chatHistory };
            const apiKey = "";
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }

            const result = await response.json();
            if (result.candidates && result.candidates.length > 0 && result.candidates[0].content && result.candidates[0].content.parts && result.candidates[0].content.parts.length > 0) {
                const text = result.candidates[0].content.parts[0].text;
                setCurrentAnswer(text);
            } else {
                throw new Error("Invalid response structure from API");
            }
        } catch (error) {
            console.error("Error generating AI response:", error);
            setCurrentAnswer("Sorry, I encountered an error while generating a response. Please try again.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleHosQaClose = () => {
        setCurrentAnswer(null);
        setSubmittedQuestion(null);
    };

    // --- New Handbook Topic Search Handler ---
    const handleTopicSearch = () => {
        if (!handbookTopicQuery) return;
        setIsAnalyzingTopic(true);
        setHandbookTopicResults(null);

        setTimeout(() => { // Simulate AI analysis
            const query = handbookTopicQuery.toLowerCase();
            const results = [];

            for (const sectionTitle in handbookSectionLanguage) {
                const sectionText = handbookSectionLanguage[sectionTitle];
                // Regex to split the text into subsections (e.g., "1.1 Welcome", "1.2 Purpose")
                const subsections = sectionText.split(/(?=\n\d+\.\d+ )/);
                
                const foundSubsections = [];
                for (const sub of subsections) {
                    if (sub.toLowerCase().includes(query)) {
                        foundSubsections.push(sub.trim());
                    }
                }

                if (foundSubsections.length > 0) {
                    results.push({
                        mainTitle: sectionTitle,
                        subsections: foundSubsections,
                    });
                }
            }
            setHandbookTopicResults(results);
            setIsAnalyzingTopic(false);
        }, 1500);
    };

    // --- New Legal Q&A Handler ---
    const handleLegalQaSubmit = async () => {
        const questionText = legalQuestion;
        if (!questionText) return;

        setSubmittedLegalQuestion(questionText);
        setIsAnalyzingLegal(true);
        setLegalAnswer(null);
        setLegalQuestion("");

        const prompt = `Analyze the following legal question for a school administrator and provide a structured response. The question is: "${questionText}". Please format your response as a JSON object with three keys: "guidance", "references", and "risk". The "risk" key should contain an object with "level", "analysis", and "recommendation".`;
        
        const legalResponseSchema = {
            type: "OBJECT",
            properties: {
                "guidance": { "type": "STRING" },
                "references": { "type": "STRING" },
                "risk": {
                    type: "OBJECT",
                    properties: {
                        "level": { "type": "STRING" },
                        "analysis": { "type": "STRING" },
                        "recommendation": { "type": "STRING" }
                    },
                    required: ["level", "analysis", "recommendation"]
                }
            },
            required: ["guidance", "references", "risk"]
        };

        try {
            let chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
            const payload = { 
                contents: chatHistory,
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: legalResponseSchema
                }
            };
            const apiKey = "";
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }

            const result = await response.json();
            if (result.candidates && result.candidates.length > 0 && result.candidates[0].content && result.candidates[0].content.parts && result.candidates[0].content.parts.length > 0) {
                const jsonText = result.candidates[0].content.parts[0].text;
                const parsedAnswer = JSON.parse(jsonText);
                setLegalAnswer(parsedAnswer);
            } else {
                throw new Error("Invalid response structure from API");
            }
        } catch (error) {
            console.error("Error generating legal AI response:", error);
            setLegalAnswer({
                guidance: "Sorry, I encountered an error. Please ensure your question is clear and try again.",
                references: "N/A",
                risk: { level: "Unknown", analysis: "Could not analyze risk due to an error.", recommendation: "Please rephrase your question or contact legal counsel directly." }
            });
        } finally {
            setIsAnalyzingLegal(false);
        }
    };

    const handleLegalQaClose = () => {
        setSubmittedLegalQuestion(null);
        setLegalAnswer(null);
    };


    // --- Page Content Components/Variables ---

    const DASHBOARD = (
        <div className="flex flex-col gap-8 max-w-4xl mx-auto">
            <Card className="shadow-2xl border-0 hover:shadow-3xl transition-shadow" style={{ background: "#4B5C64" }}>
                <CardContent className="p-6" style={{ color: "#fff" }}>
                    <SectionHeader icon={<Shield className="text-blue-600" size={28} />} title="Welcome" />
                    <div className="text-lg text-white mb-3 space-y-4">
                        <p><strong>Navigation IQ<sup style={{ fontSize: '0.6em' }}>TM</sup> is the new standard in dynamic policy, guidance, and risk management for school leaders.</strong></p>
                        <p>Our System has been designed with input from  school leaders as an intelligence based Micro Utility providing proactive clarity and solutions for risk management, policy guidance, industry insights, and counsel, empowering school leaders with efficient certainty to stay ahead of day-to-day challenges.</p>
                        <p>Resolve faculty/student/parent issues and complaints, navigate legal complexities, identify handbook vulnerabilities, and protect your school community, while saving time, reducing costs, and strengthening your leadership impact.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );

    const HANDBOOK = (
        <div className="max-w-2xl mx-auto space-y-8">
            <Card className="shadow-2xl border-0" style={{ background: "#4B5C64" }}>
                <CardContent className="p-6" style={{ color: "#fff" }}>
                    <SectionHeader icon={<BookOpen className="text-[#faecc4]" size={26} />} title="Handbook Analysis" />
                    
                    {/* --- Feature 1: Select by Section --- */}
                    <div>
                        <h3 className="text-lg font-bold mb-2" style={{ color: "#faecc4" }}>1. Review by Section</h3>
                        <div className="mb-2">
                            <label className="block font-medium">Select Section</label>
                            <select
                                className="mt-1 block w-full border rounded p-2 shadow"
                                style={{ background: "#fff", color: "#222", border: "2px solid #faecc4" }}
                                value={selectedSection}
                                onChange={e => {
                                    setSelectedSection(e.target.value);
                                    setIsSectionLanguageOpen(false);
                                }}
                            >
                                {demoHandbookSections.map((s) => <option key={s.section} value={s.section}>{s.section}</option>)}
                            </select>
                        </div>
                        <div className="mb-2">
                            <button className="text-lg font-bold cursor-pointer focus:outline-none" style={{ color: "#faecc4" }} onClick={() => setIsSectionLanguageOpen(open => !open)}>
                                {selectedSection}
                            </button>
                            <span className="ml-2 text-xs" style={{ color: "#fff" }}>(Click to show/hide full Handbook Section language)</span>
                        </div>
                        {isSectionLanguageOpen && (
                            <div className="bg-slate-100 p-4 rounded-xl mb-4 shadow-inner border border-slate-200 whitespace-pre-line" style={{ color: "#222", maxHeight: "320px", overflowY: "auto", fontSize: "1rem", lineHeight: "1.55" }}>
                                {handbookSectionLanguage[selectedSection]}
                            </div>
                        )}
                        <div className="font-semibold mt-10 mb-2" style={{ color: "#FFF" }}>Potential Section Vulnerabilities</div>
                        <ul className="ml-6 text-sm list-disc">
                            {(demoHandbookSections.find(s => s.section === selectedSection)?.vulnerabilities || []).map((vuln, i) => (
                                <li key={i} className={`pl-1 mb-2 p-2 rounded-lg flex items-center gap-2 shadow ${vuln.source === "Industry Trend" ? "bg-yellow-100 border-l-4 border-yellow-400" : "bg-rose-100 border-l-4 border-rose-400"}`}>
                                    <AlertCircle size={16} className={vuln.source === "Industry Trend" ? "text-slate-600" : "text-rose-600"} />
                                    <span style={{ color: "#334155" }}>{vuln.text}</span>
                                    <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-semibold bg-slate-200 text-slate-600">{vuln.source}</span>
                                </li>
                            ))}
                        </ul>
                         <div className="flex justify-end mt-4">
                            <Button
                                className="bg-blue-700 hover:bg-blue-800 text-white font-semibold px-6 py-2 rounded-xl shadow-lg flex items-center gap-2 transition-all"
                                onClick={() => {
                                    const s = demoHandbookSections.find(s => s.section === selectedSection);
                                    suggestionSectionRef.current = s.section;
                                    setSuggestedUpdate(suggestedSectionLanguage[s.section] || "Clarify this policy with specific procedures.");
                                    setShowSuggestionModal(true);
                                }}
                            >
                                <TrendingUp size={18} className="text-white opacity-80" />
                                Suggested Handbook Changes
                            </Button>
                        </div>
                    </div>

                    <hr className="my-8 border-gray-500" />

                    {/* --- Feature 2: Search by Topic --- */}
                    <div>
                        <h3 className="text-lg font-bold mb-2" style={{ color: "#faecc4" }}>2. Search Handbook by Topic</h3>
                        <p className="mb-4 text-white">Select a Topic from the Handbook to see the Associated Section and language.</p>
                        <Textarea
                            placeholder="e.g., Confidentiality, Remote Work, Discipline..."
                            className="mb-2"
                            style={{ background: "#fff", color: "#222", border: "2px solid #faecc4" }}
                            value={handbookTopicQuery}
                            onChange={e => setHandbookTopicQuery(e.target.value)}
                        />
                        <Button
                            className="bg-blue-700 hover:bg-blue-800 text-white font-semibold px-6 py-2 rounded-xl shadow-lg"
                            onClick={handleTopicSearch}
                            disabled={isAnalyzingTopic}
                        >
                            {isAnalyzingTopic ? "Analyzing..." : "Analyze Handbook"}
                        </Button>

                        {handbookTopicResults && (
                            <div className="mt-6">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-bold text-white">Results for "{handbookTopicQuery}"</h4>
                                    <Button variant="ghost" size="sm" className="text-white hover:bg-gray-600" onClick={() => { setHandbookTopicResults(null); setHandbookTopicQuery(""); }}>
                                        Clear Results
                                    </Button>
                                </div>
                                <div 
                                    className="bg-slate-100 p-4 rounded-xl shadow-inner border border-slate-200 space-y-4" 
                                    style={{ color: "#222", maxHeight: "400px", overflowY: "scroll" }}
                                >
                                    {handbookTopicResults.length > 0 ? (
                                        handbookTopicResults.map((result, index) => (
                                            <div key={index} className="border-b border-gray-300 pb-3 last:border-b-0">
                                                <h5 className="font-bold text-md text-slate-800 mb-2">{result.mainTitle}</h5>
                                                {result.subsections.map((sub, subIndex) => (
                                                    <div key={subIndex} className="pl-4 border-l-2 border-slate-300 mb-2 last:mb-0">
                                                        <HighlightedText text={sub} highlight={handbookTopicQuery} />
                                                    </div>
                                                ))}
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-slate-600">No results found for "{handbookTopicQuery}".</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
            <HandbookAuditCard />
            <HandbookVulnerabilitiesCard sections={demoHandbookSections} />
        </div>
    );

    const ALERTS = (
        <div className="max-w-2xl mx-auto space-y-8">
            <Card className="shadow-2xl border-0 rounded-2xl" style={{ background: "#4B5C64", color: "#fff" }}>
                <CardContent className="p-6">
                    <SectionHeader icon={<Bell className="text-[#faecc4]" size={26} />} title="All Alerts" />
                     <div className="mb-6 text-white space-y-4">
                        <p><strong>Below are current alerts gathered from several direct resources.</strong></p>
                        <p><strong>The Handbook Consideration button indicates that the subject matter is relevant to your handbook and potential changes should be considered.</strong></p>
                    </div>
                    <div className="max-h-96 overflow-y-scroll pr-2">
                        {alerts.map((a, i) => (
                            <React.Fragment key={i}>
                                <div className="p-2 rounded-lg hover:bg-gray-700 transition-colors">
                                    <p>{a.text} <span className="text-sm text-gray-400">- {formatDate(a.date)}</span></p>
                                    {a.hasButton && (
                                        <div className="flex justify-start mt-2">
                                            <Button
                                                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-1 rounded-lg text-xs"
                                                onClick={() => handleShowSuggestion(a)}
                                            >
                                                Handbook Consideration
                                            </Button>
                                        </div>
                                    )}
                                </div>
                                {i < alerts.length - 1 && <hr className="border-gray-600 my-1" />}
                            </React.Fragment>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );

    const TRENDS = (
        <div className="max-w-2xl mx-auto space-y-8">
            <Card className="shadow-2xl border-0 rounded-2xl" style={{ background: "#4B5C64", color: "#fff" }}>
                <CardContent className="p-6">
                    <SectionHeader icon={<TrendingUp className="text-[#faecc4]" size={26} />} title="Industry Trends & Legislation" />
                    <div className="mb-6 text-white space-y-4">
                        <p><strong>Below are current industry trends and legislation articles and information gathered from several direct resources.</strong></p>
                        <p><strong>The Handbook Consideration button indicates that the subject matter is relevant to your handbook and potential changes should be considered.</strong></p>
                    </div>
                     <div className="max-h-96 overflow-y-scroll pr-2">
                        {trends.map((t, i) => (
                            <React.Fragment key={i}>
                                <div className="p-2 rounded-lg hover:bg-gray-700 transition-colors">
                                    <p>{t.text} <span className="text-sm text-gray-400">- {formatDate(t.date)}</span></p>
                                    {t.hasButton && (
                                        <div className="flex justify-start mt-2">
                                            <Button
                                                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-1 rounded-lg text-xs"
                                                onClick={() => handleShowSuggestion(t)}
                                            >
                                                Handbook Consideration
                                            </Button>
                                        </div>
                                    )}
                                </div>
                                {i < trends.length - 1 && <hr className="border-gray-600 my-1" />}
                            </React.Fragment>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
    
    const HOSQA = (
        <div className="max-w-2xl mx-auto space-y-8">
            <Card className="shadow-2xl border-0 rounded-2xl" style={{ background: "#4B5C64", color: "#fff" }}>
                <CardContent className="p-6">
                    <SectionHeader icon={<MessageCircle className="text-[#faecc4]" size={26} />} title="School Leaders Q&A" />
                     <div className="mb-6 text-white font-bold space-y-2">
                        <p>Below you can ask specific questions by selecting a topic or generating your own question.</p>
                        <p>The system is connected to various leading edge LLM knowledge base networks and resources related to the industry that will generate answers immediately.</p>
                    </div>
                    <div className="mb-4 flex gap-2">
                        {hosQaTopics.map((topic) => (
                            <Button
                                key={topic}
                                onClick={() => setHosQaTab(topic)}
                                className={`rounded-lg transition-all ${hosQaTab === topic ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
                            >
                                {topic}
                            </Button>
                        ))}
                    </div>
                    <Textarea
                        placeholder="e.g. What are our obligations under FERPA if a parent requests to see another student's disciplinary records?"
                        className="mb-2 min-h-[100px]"
                        style={{ background: "#fff", color: "#222", border: "2px solid #faecc4" }}
                        value={hosQaQuestion}
                        onChange={e => setHosQaQuestion(e.target.value)}
                    />
                    <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 rounded-lg mb-4"
                        onClick={currentAnswer ? handleHosQaClose : handleHosQaSubmit}
                        disabled={isAnalyzing}
                    >
                        {isAnalyzing ? "Analyzing..." : (currentAnswer ? "Close" : "Submit")}
                    </Button>

                    {submittedQuestion && (
                        <div className="mt-4 space-y-4">
                            <div className="p-3 bg-gray-700 rounded-md">
                                <p className="font-semibold">{submittedQuestion}</p>
                                {isAnalyzing && <p className="text-sm text-yellow-400 mt-2">Analyzing...</p>}
                                {currentAnswer && (
                                     <div className="mt-3 p-3 bg-gray-800 rounded-md border-l-4 border-blue-400 whitespace-pre-line">
                                        <p className="text-sm">{currentAnswer}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <IndustryQuestionsCard />

        </div>
    );

    const LEGAL = (
        <div className="max-w-2xl mx-auto space-y-8">
            <Card className="shadow-2xl border-0 rounded-2xl" style={{ background: "#4B5C64", color: "#fff" }}>
                <CardContent className="p-6">
                    <SectionHeader icon={<Gavel className="text-[#faecc4]" size={26} />} title="Legal Guidance" />
                    <div className="mb-6 text-white space-y-3">
                        <p><strong>Structured Legal Analysis:</strong> Get preliminary legal guidance on complex legal issues.</p>
                        <ul className="list-disc pl-5 space-y-1 text-sm">
                            <li><strong>Legal Answer:</strong> A direct, actionable answer.</li>
                            <li><strong>Key References:</strong> Citations to the relevant law.</li>
                            <li><strong>Risk Analysis & Recommendation:</strong> An assessment of the potential pitfalls and clear, immediate next steps.</li>
                        </ul>
                        <p className="text-sm pt-2">This tool provides an initial analysis and guidance based on common legal frameworks, but if further information is required, is not a substitute for advice from your school's attorney.</p>
                    </div>
                    <p className="mb-2 font-semibold text-white">Enter a legal question or discussion for analysis...</p>
                    <Textarea
                        placeholder="e.g. We've received a subpoena from a local law firm demanding all of a student's academic and disciplinary records for a custody case. Do we have to comply immediately?"
                        className="mb-2 min-h-[100px]"
                        style={{ background: "#fff", color: "#222", border: "2px solid #faecc4" }}
                        value={legalQuestion}
                        onChange={e => setLegalQuestion(e.target.value)}
                    />
                    <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 rounded-lg mb-4"
                        onClick={submittedLegalQuestion ? handleLegalQaClose : handleLegalQaSubmit}
                        disabled={isAnalyzingLegal}
                    >
                        {isAnalyzingLegal ? "Analyzing..." : (submittedLegalQuestion ? "Close" : "Submit for Analysis")}
                    </Button>

                    {submittedLegalQuestion && (
                        <div className="mt-4 p-4 bg-gray-700 rounded-lg">
                            <p className="font-semibold italic text-white mb-4">{`Q: "${submittedLegalQuestion}"`}</p>
                            {isAnalyzingLegal && <p className="text-sm text-yellow-400">Analyzing...</p>}
                            {legalAnswer && (
                                <div className="space-y-4 text-sm">
                                    <div className="p-3 bg-gray-800 rounded-md border-l-4 border-blue-400">
                                        <h4 className="font-bold text-blue-300 mb-1">Legal Guidance</h4>
                                        <p>{legalAnswer.guidance}</p>
                                    </div>
                                    <div className="p-3 bg-gray-800 rounded-md border-l-4 border-green-400">
                                        <h4 className="font-bold text-green-300 mb-1">Key References</h4>
                                        <p>{legalAnswer.references}</p>
                                    </div>
                                    <div className={`p-3 bg-gray-800 rounded-md border-l-4 ${legalAnswer.risk.level === 'High' ? 'border-red-400' : 'border-yellow-400'}`}>
                                        <h4 className={`font-bold ${legalAnswer.risk.level === 'High' ? 'text-red-300' : 'text-yellow-300'} mb-1`}>Risk Analysis & Recommendation</h4>
                                        <p className="mb-2">{legalAnswer.risk.analysis}</p>
                                        <p className="font-semibold">{legalAnswer.risk.recommendation}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
            <Card className="shadow-2xl border-0 rounded-2xl" style={{ background: "#4B5C64", color: "#fff" }}>
                <CardContent className="p-6">
                    <SectionHeader icon={<Gavel className="text-[#faecc4]" size={26} />} title="Get Direct Legal Help" />
                    <div className="mb-3">
                        Reach out for legal counsel about your issue. Begin by adding a brief overview below, and click submit to schedule a phone conference.<br />
                        <span className="text-blue-400 text-xs">(Annual Legal Counsel Credits will be applied if applicable.)</span>
                    </div>
                    <Textarea
                        className="w-full min-h-[100px] border rounded-md mb-2"
                        placeholder="Briefly describe your legal issue or question..."
                        style={{ background: "#fff", color: "#222", border: "2px solid #faecc4" }}
                    />
                    <Button
                        size="lg"
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg mt-2"
                    >
                        Submit &amp; Schedule Call
                    </Button>
                </CardContent>
            </Card>
        </div>
    );


    // --- Main Return ---
    return (
        <div className="min-h-screen flex flex-col" style={{ background: "#fff" }}>
            <style>{`
                .report-viewer-modal .expandable-option-container {
                    background-color: #4B5C64 !important;
                    border-color: #6b7280 !important;
                }
                .report-viewer-modal .expandable-option-title {
                    color: #faecc4 !important;
                }
                .report-viewer-modal .expandable-option-content,
                .report-viewer-modal .expandable-option-content p,
                .report-viewer-modal .expandable-option-content strong {
                    color: #ffffff !important;
                }
            `}</style>
            <header className="shadow flex items-center justify-between px-8 py-4" style={{ background: "#7c2d2d" }}>
                {/* School Logo */}
                <img
                    src={SCHOOL_LOGO}
                    alt="School Logo"
                    className="h-20 w-20 rounded-2xl border-4 border-white object-cover shadow-lg"
                />

                {/* Title and Tagline Container */}
                <div className="text-right">
                    {/* Main Title */}
                    <div
                        className="flex items-center justify-end"
                        style={{
                            color: "#fff",
                            fontSize: "2.5rem",
                            lineHeight: 1.1,
                            fontFamily: 'Arial, sans-serif'
                        }}
                    >
                        <span className="font-normal">
                            Navigation IQ
                            <sup style={{ fontSize: '0.3em', position: 'relative', top: '-1.5em', marginLeft: '2px' }}>TM</sup>
                        </span>
                    </div>

                    {/* Updated Tagline */}
                    <div
                        className="font-semibold"
                        style={{
                            color: "#faecc4",
                            fontSize: "0.9rem",
                            marginTop: "4px",
                            lineHeight: 1.4
                        }}
                    >
                        The Smart Navigation System for School Policy, Risk Management,
                        <br />
                        Incident Guidance, and Regulatory Insights
                    </div>
                </div>
            </header>

            <div className="flex flex-1 min-h-0">
                <aside className="border-r pt-2 px-4 flex flex-col gap-2 min-w-[230px] shadow-md" style={{ background: "#7c2d2d" }}>
                    {SIDEBAR_LINKS.map(link => (
                        <Button
                            key={link.key}
                            variant="ghost"
                            className="flex items-center gap-3 px-5 py-2 w-full justify-start text-base font-semibold rounded-lg shadow border-2 border-white transition-all"
                            style={{
                                background: page === link.key ? "#7c2d2d" : "#fff",
                                color: page === link.key ? "#fff" : "#111",
                                borderColor: "#fff"
                            }}
                            onClick={() => setPage(link.key)}
                        >
                            {React.cloneElement(link.icon, { color: page === link.key ? "#fff" : "#7c2d2d" })}
                            {link.label}
                        </Button>
                    ))}
                </aside>

                <main className="flex-1 p-10 overflow-y-auto bg-gray-100">
                    {page === "dashboard" && DASHBOARD}
                    {page === "risk" && <RiskAssessmentCenter handbookText={handbookSectionLanguage} handbookIndex={handbookSections} />}
                    {page === "handbook" && HANDBOOK}
                    {page === "alerts" && ALERTS}
                    {page === "trends" && TRENDS}
                    {page === "hosqa" && HOSQA}
                    {page === "legal" && LEGAL}
                </main>
            </div>

            {showSuggestionModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                    <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-lg w-full">
                        <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                            <TrendingUp className="text-emerald-600" size={24} /> Suggested Update
                        </h3>
                        <div className="mb-6 text-slate-700 font-medium whitespace-pre-line">{suggestedUpdate}</div>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setShowSuggestionModal(false)} className="rounded-lg px-5">Cancel</Button>
                            <Button className="bg-blue-700 hover:bg-blue-800 text-white font-semibold px-5 rounded-lg" onClick={() => { setShowSuggestionModal(false); console.log(`Suggestion for "${suggestionSectionRef.current}" recorded.`); }}>
                                Add Suggestion to Handbook
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
