import type { ICategorySummary } from "../../types";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface CategorySummaryProps {
    summaries: ICategorySummary[];
}

export function CategorySummary({ summaries }: CategorySummaryProps) {
    return (
        <div>
            <h2>Category Summary</h2>
            <div style={{ height: '400px', width: '600px'}}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={summaries}
                        margin={{
                            top: 5,
                            right: 30,
                            left: 20,
                            bottom: 5,
                        }}
                    >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="budget" fill="#8884d8" />
                        <Bar dataKey="expenditure" fill="#82ca9d" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
