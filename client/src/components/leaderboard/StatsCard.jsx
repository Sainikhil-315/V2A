// src/components/leaderboard/StatsCard.jsx
import React from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'

const StatsCard = ({ 
  title, 
  value, 
  change, 
  changeType = 'neutral', 
  icon: Icon,
  color = 'blue',
  subtitle = null 
}) => {
  const getChangeColor = () => {
    switch (changeType) {
      case 'positive':
        return 'text-green-600'
      case 'negative':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const getChangeIcon = () => {
    if (changeType === 'positive') {
      return <TrendingUp className="w-3 h-3" />
    } else if (changeType === 'negative') {
      return <TrendingDown className="w-3 h-3" />
    }
    return null
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
          {change && (
            <div className={`flex items-center mt-2 ${getChangeColor()}`}>
              {getChangeIcon()}
              <span className="text-sm ml-1">{change}</span>
            </div>
          )}
        </div>
        
        {Icon && (
          <div className={`p-3 rounded-full bg-${color}-100`}>
            <Icon className={`w-6 h-6 text-${color}-600`} />
          </div>
        )}
      </div>
    </div>
  )
}

export default StatsCard