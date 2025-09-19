import React, { useEffect, useState } from 'react';
import { LogOut, CheckCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { authoritiesAPI } from '../../utils/api';

const AuthorityDashboard = ({ authority, token, onLogout }) => {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(null);

  useEffect(() => {
    const fetchIssues = async () => {
      setLoading(true);
      try {
        const res = await authoritiesAPI.getAssignedIssues(authority.id, token);
        setIssues(res.data.data.issues || []);
      } catch (err) {
        toast.error('Failed to load issues');
      } finally {
        setLoading(false);
      }
    };
    fetchIssues();
  }, [authority, token]);

  const handleResolve = async (issueId) => {
    setResolving(issueId);
    try {
      await authoritiesAPI.resolveIssue(authority.id, issueId, token);
      toast.success('Issue marked as resolved!');
      setIssues(issues => issues.map(i => i._id === issueId ? { ...i, status: 'resolved' } : i));
    } catch (err) {
      toast.error('Failed to resolve issue');
    } finally {
      setResolving(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-700 via-purple-700 to-pink-500 p-6">
    {console.log(issues)}  
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-2xl p-8 mt-10 animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Welcome, {authority.name}</h2>
            <p className="text-gray-600 text-sm mt-1">{authority.email}</p>
          </div>
          <button
            className="flex items-center px-4 py-2 rounded-lg bg-gradient-to-r from-pink-600 to-purple-600 text-white font-semibold hover:scale-105 transition-transform"
            onClick={onLogout}
          >
            <LogOut className="w-5 h-5 mr-2" /> Logout
          </button>
        </div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Assigned Issues</h3>
        <div className="overflow-x-auto rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={4} className="text-center py-8"><Loader2 className="animate-spin w-6 h-6 mx-auto text-purple-600" /></td></tr>
              ) : issues.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-gray-500">No assigned issues</td></tr>
              ) : issues.map(issue => (
                <tr key={issue._id} className={issue.status === 'resolved' ? 'bg-green-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-black">{issue.title}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-black">{issue.category}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-black capitalize">{issue.status}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {issue.status === 'resolved' ? (
                      <span className="inline-flex items-center text-green-600 font-semibold"><CheckCircle className="w-5 h-5 mr-1" /> Resolved</span>
                    ) : (
                      <button
                        className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold flex items-center hover:scale-105 transition-transform"
                        onClick={() => handleResolve(issue._id)}
                        disabled={resolving === issue._id}
                      >
                        {resolving === issue._id ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <CheckCircle className="w-5 h-5 mr-2" />}
                        Mark as Resolved
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AuthorityDashboard;
