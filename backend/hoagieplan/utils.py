from typing import Tuple


def get_term_and_course_id(guid: str) -> Tuple[str, str]:
    """Extract term and course ID from a course GUID.

    get_term_and_course_id('1262002051') -> ('1262', '002051')
    """
    return (guid[:4], guid[4:])


def suffix_to_label(suffix: str, term_code: str) -> str:
    """Convert an AcademicTerm suffix to a human-readable label.

    Args:
        suffix: Term suffix such as ``"S2026"`` or ``"F2025"``.
        term_code: Fallback term code returned if ``suffix`` is empty.

    Returns:
        Human-readable label like ``"Spring 2026"``, or ``term_code`` if
        the suffix is missing or unrecognized.

    """
    if not suffix:
        return term_code
    if suffix.startswith("S"):
        return f"Spring {suffix[1:]}"
    if suffix.startswith("F"):
        return f"Fall {suffix[1:]}"
    return suffix
