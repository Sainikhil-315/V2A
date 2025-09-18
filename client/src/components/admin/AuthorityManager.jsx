// src/components/admin/AuthorityManager.jsx
import React, { useState, useEffect } from 'react'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Mail, 
  Phone, 
  MapPin, 
  Building,
  Users,
  Search,
  Filter
} from 'lucide-react'
import { authoritiesAPI } from '../../utils/api'
import { formatRelativeTime } from '../../utils/helpers'
import { ISSUE_CATEGORIES } from '../../utils/constants'
import LoadingButton from '../common/LoadingButton'
import { SkeletonLoader } from '../common/Loader'
import toast from 'react-hot-toast'

const AuthorityManager = () => {
  const [authorities, setAuthorities] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingAuthority, setEditingAuthority] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterDepartment, setFilterDepartment] = useState('')

  useEffect(() => {
    loadAuthorities()
  }, [searchQuery, filterDepartment])

  const loadAuthorities = async () => {
    setLoading(true)
    try {
      const params = {}
      if (searchQuery) params.search = searchQuery
      if (filterDepartment) params.department = filterDepartment
      
  const response = await authoritiesAPI.getAll(params)
  setAuthorities(response.data.data.authorities)
    } catch (error) {
      console.error('Error loading authorities:', error)
      toast.error('Failed to load authorities')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAuthority = () => {
    setEditingAuthority(null)
    setShowModal(true)
  }

  const handleEditAuthority = (authority) => {
    setEditingAuthority(authority)
    setShowModal(true)
  }

  const handleDeleteAuthority = async (authorityId) => {
    if (!confirm('Are you sure you want to delete this authority? This action cannot be undone.')) {
      return
    }

    try {
      await authoritiesAPI.delete(authorityId)
      setAuthorities(prev => prev.filter(auth => auth.id !== authorityId))
      toast.success('Authority deleted successfully')
    } catch (error) {
      console.error('Error deleting authority:', error)
      toast.error('Failed to delete authority')
    }
  }

  const departments = [...new Set(ISSUE_CATEGORIES?.map(cat => cat.label))]

  if (loading && authorities?.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <SkeletonLoader lines={2} className="mb-8" />
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <SkeletonLoader lines={10} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Building className="w-8 h-8 mr-3 text-primary-600" />
                Authority Management
              </h1>
              <p className="text-gray-600 mt-1">
                Manage government departments and authority contacts
              </p>
            </div>
            
            <div className="mt-4 sm:mt-0">
              <button
                onClick={handleCreateAuthority}
                className="btn btn-primary flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Authority
              </button>
            </div>
          </div>
          
          {/* Filters */}
          <div className="mt-6 flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search authorities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 form-input w-full text-black "
                />
              </div>
            </div>
            
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="form-select w-auto text-black"
            >
              <option value="">All Departments</option>
              {departments?.map(dept => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Authorities Table */}
        <div className="bg-white shadow-sm rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Authority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Issues Handled
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {console.log(authorities)}
                {authorities?.map((authority) => (
                  <tr key={authority._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-lg bg-primary-100 flex items-center justify-center">
                            <Building className="h-5 w-5 text-primary-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {authority.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {authority.description}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {authority.department}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="space-y-1">
                        <div className="flex items-center">
                          <Mail className="w-3 h-3 mr-1" />
                          {authority.contact.email}
                        </div>
                        <div className="flex items-center">
                          <Phone className="w-3 h-3 mr-1" />
                          {authority.contact.phone}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <Users className="w-4 h-4 mr-1" />
                        {authority.issueCount || 0} issues
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        authority.status 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {authority.status ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleEditAuthority(authority)}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteAuthority(authority._id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {authorities?.length === 0 && (
            <div className="text-center py-12">
              <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No authorities found</h3>
              <p className="text-gray-600 mb-4">
                {searchQuery || filterDepartment 
                  ? 'Try adjusting your search filters' 
                  : 'Get started by adding your first authority'
                }
              </p>
              {!searchQuery && !filterDepartment && (
                <button
                  onClick={handleCreateAuthority}
                  className="btn btn-primary"
                >
                  Add Authority
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Authority Form Modal */}
      {showModal && (
        <AuthorityFormModal
          authority={editingAuthority}
          onClose={() => {
            setShowModal(false)
            setEditingAuthority(null)
          }}
          onSave={(savedAuthority) => {
            if (editingAuthority) {
              setAuthorities(prev => Array.isArray(prev) ? prev.map(auth => auth.id === savedAuthority._id ? savedAuthority : auth) : [savedAuthority])
            } else {
              setAuthorities(prev => Array.isArray(prev) ? [...prev, savedAuthority] : [savedAuthority])
            }
            setShowModal(false)
            setEditingAuthority(null)
          }}
        />
      )}
    </div>
  )
}

// Authority Form Modal Component
const AuthorityFormModal = ({ authority, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: authority?.name || '',
    department: authority?.department || '',
    description: authority?.description || '',
    email: authority?.email || '',
    phone: authority?.phone || '',
    address: authority?.address || '',
    categories: authority?.categories || [],
    active: authority?.active !== undefined ? authority.active : true
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validation
    const newErrors = {}
    if (!formData.name.trim()) newErrors.name = 'Name is required'
    if (!formData.department) newErrors.department = 'Department is required'
    if (!formData.email.trim()) newErrors.email = 'Email is required'
    if (!formData.phone.trim()) newErrors.phone = 'Phone is required'
    if (formData.categories?.length === 0) newErrors.categories = 'At least one category is required'
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    // Build payload for backend (add default boundaries for serviceArea)
    const defaultPolygon = [
      [
        [77.5946, 12.9716], // Point 1 (lng, lat)
        [77.5950, 12.9716], // Point 2
        [77.5950, 12.9720], // Point 3
        [77.5946, 12.9720], // Point 4
        [77.5946, 12.9716]  // Closing the polygon
      ]
    ];
    const payload = {
      name: formData.name,
      department: formData.department,
      contact: {
        email: formData.email,
        phone: formData.phone,
        officeAddress: formData.address || 'N/A'
      },
      serviceArea: {
        description: formData.description || 'N/A',
        boundaries: {
          type: 'Polygon',
          coordinates: defaultPolygon
        }
      },
      active: formData.active
    }

    setLoading(true)
    try {
      let response
      if (authority) {
        response = await authoritiesAPI.update(authority._id, payload)
      } else {
        response = await authoritiesAPI.create(payload)
      }
      toast.success(`Authority ${authority ? 'updated' : 'created'} successfully`)
      onSave(response.data.authority)
    } catch (error) {
      console.error('Error saving authority:', error)
      toast.error(`Failed to ${authority ? 'update' : 'create'} authority`)
    } finally {
      setLoading(false)
    }
  }

  const handleCategoryChange = (categoryValue, checked) => {
    setFormData(prev => ({
      ...prev,
      categories: checked
        ? [...prev.categories, categoryValue]
        : prev.categories.filter(cat => cat !== categoryValue)
    }))
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          {/* Modal Header */}
          <div className="bg-white px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              {authority ? 'Edit Authority' : 'Add New Authority'}
            </h3>
          </div>

          {/* Modal Content */}
          <form onSubmit={handleSubmit} className="bg-white px-6 py-6">
            <div className="grid grid-cols-1 gap-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Authority Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className={`form-input w-full text-black  ${errors.name ? 'border-red-300' : ''}`}
                    placeholder="e.g., Municipal Corporation"
                  />
                  {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Department *
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                    className={`form-select w-full text-black ${errors.department ? 'border-red-300' : ''}`}
                  >
                    <option value="">Select Department</option>
                    {ISSUE_CATEGORIES?.map(cat => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                  {errors.department && <p className="text-red-600 text-sm mt-1">{errors.department}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="form-textarea w-full text-black "
                  placeholder="Brief description of the authority's responsibilities"
                />
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className={`form-input w-full text-black  ${errors.email ? 'border-red-300' : ''}`}
                    placeholder="contact@authority.gov"
                  />
                  {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className={`form-input w-full text-black  ${errors.phone ? 'border-red-300' : ''}`}
                    placeholder="+91-9876543210"
                  />
                  {errors.phone && <p className="text-red-600 text-sm mt-1">{errors.phone}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  className="form-input w-full text-black "
                  placeholder="Office address"
                />
              </div>

              {/* Issue Categories */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Handles Issue Categories *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {ISSUE_CATEGORIES?.map(category => (
                    <label key={category.value} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.categories.includes(category.value)}
                        onChange={(e) => handleCategoryChange(category.value, e.target.checked)}
                        className="form-checkbox mr-2"
                      />
                      <span className="text-sm text-gray-700">
                        {category.icon} {category.label}
                      </span>
                    </label>
                  ))}
                </div>
                {errors.categories && <p className="text-red-600 text-sm mt-1">{errors.categories}</p>}
              </div>

              {/* Status */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="active"
                  checked={formData.active}
                  onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                  className="form-checkbox mr-2"
                />
                <label htmlFor="active" className="text-sm text-gray-700">
                  Active (authority can receive issue assignments)
                </label>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex justify-end space-x-3 pt-6 border-t">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-outline"
                disabled={loading}
              >
                Cancel
              </button>
              <LoadingButton
                loading={loading}
                type="submit"
                className="btn btn-primary"
              >
                {authority ? 'Update Authority' : 'Create Authority'}
              </LoadingButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default AuthorityManager