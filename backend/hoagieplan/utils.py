from typing import Tuple


def get_term_and_course_id(guid: str) -> Tuple[str, str]:
    """Extract term and course ID from a course GUID.

    get_term_and_course_id('1262002051') -> ('1262', '002051')
    """
    return (guid[:4], guid[4:])
