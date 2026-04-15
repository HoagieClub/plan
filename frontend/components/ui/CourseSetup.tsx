import { type FC } from 'react';

import { getSectionColor } from '@/utils/sectionColors';

interface CourseSetupItem {
	class_type: string;
	count: number;
	duration?: number;
}

interface CourseSetupProps {
	courseSetup: CourseSetupItem[];
}

export const CourseSetup: FC<CourseSetupProps> = ({ courseSetup }) => {
	return (
		<div
			style={{
				backgroundColor: '#f5f5f5',
				// padding: '6px 16px',
				borderRadius: '6px',
				fontSize: '0.85rem',
			}}
		>
			{courseSetup.length > 0 ? (
				<>
					<div
						style={{
							fontWeight: 600,
							color: '#333',
							fontSize: '0.85rem',
						}}
					>
						{courseSetup.map((item, idx) => (
							<span key={item.class_type}>
								{item.count} {item.class_type}
								{(() => {
									if (item.count > 1) {
										if (item.class_type === 'Class') {
											return 'es';
										}
										return 's';
									}
									return '';
								})()}
								{idx < courseSetup.length - 1 ? ', ' : ''}
							</span>
						))}
					</div>
					<div
						style={{ borderBottom: '1px solid #e0e0e0', marginTop: '6px', marginBottom: '10px' }}
					/>
					<div style={{ paddingBottom: '3px', display: 'flex', flexWrap: 'wrap' }}>
						{courseSetup.flatMap((item, idx) => {
							const config = getSectionColor[item.class_type] || getSectionColor['Unknown'];
							const totalBoxes = courseSetup.reduce((acc, i) => acc + i.count, 0);
							const startIdx = courseSetup.slice(0, idx).reduce((acc, i) => acc + i.count, 0);

							return Array.from({ length: item.count }).map((_, countIdx) => {
								const absoluteIdx = startIdx + countIdx;
								const isFirst = absoluteIdx === 0;
								const isLast = absoluteIdx === totalBoxes - 1;

								return (
									<div
										key={`${item.class_type}-${countIdx}`}
										style={{
											textAlign: 'center',
											fontWeight: 600,
											flex: item.duration ?? 1,
											minWidth: '40px',
											overflow: 'hidden',
											borderTopLeftRadius: isFirst ? '6px' : 0,
											borderBottomLeftRadius: isFirst ? '6px' : 0,
											borderTopRightRadius: isLast ? '6px' : 0,
											borderBottomRightRadius: isLast ? '6px' : 0,
										}}
									>
										<div
											style={{
												backgroundColor: config.color,
												color: 'white',
												fontSize: '0.9rem',
												fontWeight: 'bold',
												padding: '4px 0',
											}}
										>
											{config.abbr}
										</div>
										<div
											style={{
												backgroundColor: config.lightColor ?? config.color + '99',
												color: 'white',
												fontSize: '0.75rem',
												padding: '3px 0',
											}}
										>
											{item.duration} m.
										</div>
									</div>
								);
							});
						})}
					</div>
				</>
			) : (
				<div style={{ color: '#999', fontStyle: 'italic', padding: '8px 0' }}>
					No section information available
				</div>
			)}
		</div>
	);
};
