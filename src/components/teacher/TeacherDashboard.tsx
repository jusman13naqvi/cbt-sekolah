import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { ExamList } from './ExamList';
import { ExamEditorModal } from './ExamEditor';
import { QuestionBankEditor } from './QuestionBankEditor';
import { LiveMonitoring } from './LiveMonitoring';
import { EssayGrading } from './EssayGrading';
import { ExamReportView } from './ExamReportView';
import { SubjectsManagement } from './SubjectsManagement';
import { RefreshCw } from 'lucide-react';

interface TeacherDashboardProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ activeTab, setActiveTab }) => {
  const [exams, setExams] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Active view states for sub-components in exams tab
  const [subView, setSubView] = useState<'list' | 'questions' | 'monitoring'>('list');
  const [activeExam, setActiveExam] = useState<any>(null);

  // Editor Modal
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<any>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [eData, sData, cData] = await Promise.all([
        api.getTeacherExams(),
        api.getSubjects(),
        api.getClasses(),
      ]);
      setExams(eData);
      setSubjects(sData);
      setClasses(cData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Reset subView whenever main activeTab changes in sidebar
  useEffect(() => {
    setSubView('list');
  }, [activeTab]);

  const handleOpenQuestions = async (exam: any) => {
    try {
      const detailedExam = await api.getExamDetail(exam.id);
      setActiveExam(detailedExam);
      setSubView('questions');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleOpenMonitoring = (exam: any) => {
    setActiveExam(exam);
    setSubView('monitoring');
  };

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-8 h-8 text-cyan-500 animate-spin" />
        <p className="text-xs text-slate-400">Memuat dashboard guru...</p>
      </div>
    );
  }

  if (activeTab === 'subjects') {
    return <SubjectsManagement />;
  }

  if (activeTab === 'essay-grading') {
    return <EssayGrading exams={exams} onBack={() => setActiveTab('exams')} />;
  }

  if (activeTab === 'reports') {
    return <ExamReportView exams={exams} />;
  }

  if (subView === 'questions' && activeExam) {
    return (
      <QuestionBankEditor
        exam={activeExam}
        onBack={() => setSubView('list')}
        onQuestionsUpdated={() => handleOpenQuestions(activeExam)}
      />
    );
  }

  if (activeTab === 'monitoring' || subView === 'monitoring') {
    return <LiveMonitoring exam={activeExam} allExams={exams} onBack={() => { setSubView('list'); setActiveTab('exams'); }} />;
  }

  return (
    <div className="space-y-6">
      <ExamList
        exams={exams}
        onRefresh={loadData}
        onOpenCreate={() => {
          setEditingExam(null);
          setIsEditorOpen(true);
        }}
        onOpenEdit={(ex) => {
          setEditingExam(ex);
          setIsEditorOpen(true);
        }}
        onOpenQuestions={handleOpenQuestions}
        onOpenMonitoring={handleOpenMonitoring}
      />

      {isEditorOpen && (
        <ExamEditorModal
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          onSaveSuccess={loadData}
          subjects={subjects}
          classes={classes}
          examData={editingExam}
        />
      )}
    </div>
  );
};
